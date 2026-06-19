import { beforeEach, describe, expect, it, vi } from "vitest"

const captureExceptionSpy = vi.fn()

vi.mock("@/infrastructure/observability/sentry", () => ({
  Sentry: {
    captureException: (...args: unknown[]) => captureExceptionSpy(...args),
  },
}))

vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}))

const { searchEvents } = await import("./search-api")
const { supabase } = await import("@/infrastructure/supabase/client")

const mockRpc = vi.mocked(supabase.rpc)

function mockRpcResponse<T>(data: T) {
  return {
    data,
    error: null,
    count: null,
    status: 200,
    statusText: "OK",
    success: true,
  } as Parameters<typeof mockRpc.mockResolvedValueOnce>[0]
}

// A complete base event row as search_events emits it. Matches the required
// columns of eventRowSchema (apps/web/src/lib/schemas/event.ts) so it survives
// boundary validation — search_events returns base rows, not enriched rows.
function fakeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: `evt-${Math.random().toString(36).slice(2, 8)}`,
    title: "Test Event",
    description: null,
    start_datetime: "2026-06-01T10:00:00Z",
    end_datetime: null,
    timezone: "America/Chicago",
    venue_name: null,
    address: null,
    city_id: null,
    latitude: null,
    longitude: null,
    age_min: null,
    age_max: null,
    price: null,
    is_free: true,
    source_url: null,
    source_name: null,
    source_id: null,
    images: [],
    status: "published",
    ai_confidence: null,
    ai_tag_provider: null,
    is_featured: false,
    view_count: 0,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    ...overrides,
  }
}

describe("searchEvents", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    captureExceptionSpy.mockClear()
  })

  it("calls search_events RPC with keyword and city", async () => {
    const events = [fakeEvent({ title: "Story Time" })]
    mockRpc.mockResolvedValueOnce(mockRpcResponse(events))

    const result = await searchEvents({ keyword: "story", cityId: "city-1" })

    expect(mockRpc).toHaveBeenCalledOnce()
    const [rpcName, args] = mockRpc.mock.calls[0]!
    expect(rpcName).toBe("search_events")
    expect(args).toMatchObject({
      p_keyword: "story",
      p_city_id: "city-1",
    })
    expect(result.events).toHaveLength(1)
    expect(result.events[0]!.title).toBe("Story Time")
  })

  it("passes radius params when provided", async () => {
    mockRpc.mockResolvedValueOnce(mockRpcResponse([]))

    await searchEvents({ lat: 30.45, lng: -91.18, radiusKm: 10 })

    const [, args] = mockRpc.mock.calls[0]!
    expect(args).toMatchObject({
      p_lat: 30.45,
      p_lng: -91.18,
      p_radius_km: 10,
    })
  })

  it("passes cursor params for pagination", async () => {
    mockRpc.mockResolvedValueOnce(mockRpcResponse([]))

    await searchEvents({
      afterStartDatetime: "2026-06-01T10:00:00Z",
      afterId: "evt-abc",
    })

    const [, args] = mockRpc.mock.calls[0]!
    expect(args).toMatchObject({
      p_after_start_datetime: "2026-06-01T10:00:00Z",
      p_after_id: "evt-abc",
    })
  })

  it("returns nextCursor when page is full", async () => {
    // Default page size is 24, so 24 events = full page
    const events = Array.from({ length: 24 }, (_, i) =>
      fakeEvent({
        id: `evt-${i}`,
        start_datetime: `2026-06-0${(i % 9) + 1}T10:00:00Z`,
      })
    )
    mockRpc.mockResolvedValueOnce(mockRpcResponse(events))

    const result = await searchEvents({})

    expect(result.nextCursor).not.toBeNull()
    expect(result.nextCursor!.afterId).toBe("evt-23")
  })

  it("returns null nextCursor when page is not full", async () => {
    const events = [fakeEvent()]
    mockRpc.mockResolvedValueOnce(mockRpcResponse(events))

    const result = await searchEvents({})

    expect(result.nextCursor).toBeNull()
  })

  it("maps a valid base row to EventWithDetails with enrichment defaults", async () => {
    const events = [fakeEvent({ id: "evt-1", title: "Story Time" })]
    mockRpc.mockResolvedValueOnce(mockRpcResponse(events))

    const result = await searchEvents({})

    expect(result.events).toHaveLength(1)
    const event = result.events[0]!
    // Base fields survive validation.
    expect(event.id).toBe("evt-1")
    expect(event.title).toBe("Story Time")
    expect(event.images).toEqual([])
    // Enrichment defaults are appended (search has no tags/ratings).
    expect(event.tags).toEqual([])
    expect(event.avg_rating).toBe(0)
    expect(event.rating_count).toBe(0)
    expect(event.is_favorited).toBe(false)
    expect(event.is_in_calendar).toBe(false)
    expect(captureExceptionSpy).not.toHaveBeenCalled()
  })

  it("passes tag slugs and free filter", async () => {
    mockRpc.mockResolvedValueOnce(mockRpcResponse([]))

    await searchEvents({
      tagSlugs: ["music", "outdoor"],
      isFree: true,
    })

    const [, args] = mockRpc.mock.calls[0]!
    expect(args).toMatchObject({
      p_tag_slugs: ["music", "outdoor"],
      p_is_free: true,
    })
  })

  it("omits undefined optional params", async () => {
    mockRpc.mockResolvedValueOnce(mockRpcResponse([]))

    await searchEvents({})

    const [, args] = mockRpc.mock.calls[0]!
    expect(args).toMatchObject({
      p_keyword: undefined,
      p_city_id: undefined,
      p_lat: undefined,
      p_lng: undefined,
      p_radius_km: undefined,
    })
  })

  it("throws on RPC error", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "rpc failed", code: "42000", details: "", hint: "" },
      count: null,
      status: 500,
      statusText: "Internal Server Error",
    } as Parameters<typeof mockRpc.mockResolvedValueOnce>[0])

    await expect(searchEvents({})).rejects.toMatchObject({ message: "rpc failed" })
  })

  // Drift guard: if search_events renames/drops a column, the row fails zod
  // validation. parseRowsWithSentry drops it and captures to Sentry rather than
  // letting the malformed shape crash a render card. The search must not throw.
  it("drops a malformed/drifted row and captures it to Sentry without throwing", async () => {
    const goodRow = fakeEvent({ id: "evt-good", title: "Valid Event" })
    // Required base column `start_datetime` missing → fails eventRowSchema.
    const { start_datetime: _omitted, ...driftedRow } = fakeEvent({ id: "evt-bad" })
    mockRpc.mockResolvedValueOnce(mockRpcResponse([goodRow, driftedRow]))

    const result = await searchEvents({})

    // Only the valid row survives; the drifted one is dropped.
    expect(result.events).toHaveLength(1)
    expect(result.events[0]!.id).toBe("evt-good")
    // Drift is observable, not silently swallowed.
    expect(captureExceptionSpy).toHaveBeenCalledTimes(1)
    expect(captureExceptionSpy.mock.calls[0]![1]).toMatchObject({
      tags: { area: "search_events" },
      extra: { row_id: "evt-bad" },
    })
  })

  it("returns an empty page without Sentry noise when the RPC yields no rows", async () => {
    mockRpc.mockResolvedValueOnce(mockRpcResponse(null))

    const result = await searchEvents({})

    expect(result.events).toEqual([])
    expect(result.nextCursor).toBeNull()
    expect(captureExceptionSpy).not.toHaveBeenCalled()
  })
})
