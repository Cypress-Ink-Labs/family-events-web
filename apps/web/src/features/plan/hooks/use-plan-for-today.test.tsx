// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import type { City } from "@/shared/types"

const captureExceptionSpy = vi.fn()

vi.mock("@/infrastructure/observability/sentry", () => ({
  Sentry: {
    captureException: (...args: unknown[]) => captureExceptionSpy(...args),
  },
}))

// plan_events_first_nonempty_window + events_enriched are the only two RPCs the
// hook hits. The mock returns the canned payload registered per test below.
const rpcResults = new Map<string, { data: unknown; error: unknown }>()
const rpcSpy = vi.fn((name: string, _params?: unknown) =>
  Promise.resolve(rpcResults.get(name) ?? { data: [], error: null })
)
vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: {
    rpc: rpcSpy,
  },
}))

// adaptEnrichedRow parses through zod; for hydration-mismatch tests we only care
// about the row's id, so stub it to echo a minimal EventWithDetails-shaped object.
vi.mock("@/features/events/hooks/use-enriched-events", () => ({
  adaptEnrichedRow: (row: unknown) => row as { id: string },
}))

// Geolocation/weather only feed the query key + the (null) weather snapshot here.
vi.mock("@/features/plan/hooks/use-geolocation", () => ({
  useGeolocation: () => ({
    latitude: null,
    longitude: null,
    source: "none" as const,
    status: "fallback" as const,
  }),
}))
vi.mock("@/features/plan/hooks/use-weather", () => ({
  useWeather: () => ({ data: null }),
}))

const { usePlanForToday } = await import("./use-plan-for-today")

function rankedRow(eventId: string, dayOffset = 0) {
  return {
    event_id: eventId,
    score: 1,
    distance_score: 1,
    weather_score: 1,
    age_score: 1,
    history_affinity: 1,
    distance_km: null,
    day_offset: dayOffset,
  }
}

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

function renderPlan(options: { selectedCity?: City | null } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return {
    client,
    ...renderHook(() => usePlanForToday({ userId: "user-1", ...options }), {
      wrapper: wrapper(client),
    }),
  }
}

beforeEach(() => {
  rpcResults.clear()
  captureExceptionSpy.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe("usePlanForToday hydration observability", () => {
  it("returns every ranked event and never captures when all rows hydrate", async () => {
    rpcResults.set("plan_events_first_nonempty_window", {
      data: [rankedRow("e1"), rankedRow("e2")],
      error: null,
    })
    rpcResults.set("events_enriched", {
      data: [{ id: "e1" }, { id: "e2" }],
      error: null,
    })

    const { result } = renderPlan()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.events.map((event) => event.id)).toEqual(["e1", "e2"])
    expect(captureExceptionSpy).not.toHaveBeenCalled()
  })

  it("captures once with the missing id and still omits the unhydrated event", async () => {
    rpcResults.set("plan_events_first_nonempty_window", {
      data: [rankedRow("e1"), rankedRow("e2")],
      error: null,
    })
    // e2 is missing from the enrichment payload — it should be dropped silently
    // but surfaced to Sentry.
    rpcResults.set("events_enriched", {
      data: [{ id: "e1" }],
      error: null,
    })

    const { result } = renderPlan()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.events.map((event) => event.id)).toEqual(["e1"])

    expect(captureExceptionSpy).toHaveBeenCalledTimes(1)
    const call = captureExceptionSpy.mock.calls[0]!
    expect(call[1]).toMatchObject({
      tags: { area: "plan.hydration" },
      extra: { expected: 2, got: 1, missingIds: ["e2"] },
    })
  })
})

describe("usePlanForToday date key", () => {
  it("uses the selected city's local date in the query key and planner RPC", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-24T02:00:00.000Z"))
    const selectedCity = { id: "city-1", timezone: "America/Chicago" } as City
    const { client, result } = renderPlan({ selectedCity })

    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(
      client.getQueryCache().find({
        queryKey: qk.saturdayPlan.byContext({
          userId: "user-1",
          cityId: "city-1",
          latitude: null,
          longitude: null,
          weatherFit: "any",
          dateKey: "2026-07-23",
        }),
        exact: true,
      })
    ).toBeDefined()
    expect(rpcSpy).toHaveBeenCalledWith(
      "plan_events_first_nonempty_window",
      expect.objectContaining({ p_date: "2026-07-23" })
    )
  })

  it("uses UTC for the date key when no city is selected", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-24T02:00:00.000Z"))
    const { client, result } = renderPlan()

    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(
      client.getQueryCache().find({
        queryKey: qk.saturdayPlan.byContext({
          userId: "user-1",
          latitude: null,
          longitude: null,
          weatherFit: "any",
          dateKey: "2026-07-24",
        }),
        exact: true,
      })
    ).toBeDefined()
    expect(rpcSpy).toHaveBeenCalledWith(
      "plan_events_first_nonempty_window",
      expect.objectContaining({ p_date: "2026-07-24" })
    )
  })
})
