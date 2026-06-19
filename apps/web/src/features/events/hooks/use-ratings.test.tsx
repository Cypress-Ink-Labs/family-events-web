// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"

vi.mock("@/features/events/api/ratings", () => ({
  upsertEventRating: vi.fn(),
  getUserEventRating: vi.fn(),
}))

vi.mock("@/features/events/lib/event-cache", () => ({
  invalidateEventProjectionQueries: vi.fn(),
}))

import { upsertEventRating } from "@/features/events/api/ratings"
import { invalidateEventProjectionQueries } from "@/features/events/lib/event-cache"
import { useUpsertRating } from "./use-ratings"

const USER_ID = "user-1"
const EVENT_ID = "event-1"

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
}

afterEach(() => vi.clearAllMocks())

describe("useUpsertRating", () => {
  it("upserts the rating and invalidates the rating + projection caches on success", async () => {
    vi.mocked(upsertEventRating).mockResolvedValue({
      id: "rating-1",
      user_id: USER_ID,
      event_id: EVENT_ID,
      score: 5,
      created_at: "2026-06-18T00:00:00.000Z",
    })
    const client = makeQueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useUpsertRating(USER_ID), { wrapper: wrapper(client) })

    result.current.mutate({ eventId: EVENT_ID, score: 5 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(upsertEventRating).toHaveBeenCalledWith({ userId: USER_ID, eventId: EVENT_ID, score: 5 })

    const invalidated = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidated).toContainEqual(qk.ratings.byEvent(EVENT_ID))
    expect(invalidated).toContainEqual(qk.ratings.userEvent(USER_ID, EVENT_ID))

    expect(invalidateEventProjectionQueries).toHaveBeenCalledWith(expect.anything(), EVENT_ID)
  })

  it("does not invalidate anything when the upsert API rejects", async () => {
    vi.mocked(upsertEventRating).mockRejectedValue(new Error("nope"))
    const client = makeQueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useUpsertRating(USER_ID), { wrapper: wrapper(client) })

    result.current.mutate({ eventId: EVENT_ID, score: 3 })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(spy).not.toHaveBeenCalled()
    expect(invalidateEventProjectionQueries).not.toHaveBeenCalled()
  })

  it("rejects without calling the API when there is no signed-in user", async () => {
    const client = makeQueryClient()
    const { result } = renderHook(() => useUpsertRating(undefined), { wrapper: wrapper(client) })

    result.current.mutate({ eventId: EVENT_ID, score: 4 })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toContain("signed in")
    expect(upsertEventRating).not.toHaveBeenCalled()
    expect(invalidateEventProjectionQueries).not.toHaveBeenCalled()
  })
})
