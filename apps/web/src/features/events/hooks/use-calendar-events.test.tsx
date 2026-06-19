// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"

vi.mock("@/features/events/api/calendar", () => ({
  addToCalendar: vi.fn().mockResolvedValue(undefined),
  removeFromCalendar: vi.fn().mockResolvedValue(undefined),
  listCalendarEvents: vi.fn(),
}))

vi.mock("@/features/events/lib/event-cache", () => ({
  invalidateEventProjectionQueries: vi.fn(),
}))

import { addToCalendar, removeFromCalendar } from "@/features/events/api/calendar"
import { invalidateEventProjectionQueries } from "@/features/events/lib/event-cache"
import { useToggleCalendarEvent } from "./use-calendar-events"

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

describe("useToggleCalendarEvent", () => {
  it("adds to the calendar and invalidates calendar + projection caches when not yet saved", async () => {
    const client = makeQueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useToggleCalendarEvent(USER_ID), {
      wrapper: wrapper(client),
    })

    result.current.mutate({ eventId: EVENT_ID, isInCalendar: false, notes: "bring snacks" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(addToCalendar).toHaveBeenCalledWith(USER_ID, EVENT_ID, "bring snacks")
    expect(removeFromCalendar).not.toHaveBeenCalled()
    expect(result.current.data).toBe(true)

    const invalidated = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidated).toContainEqual(qk.calendarEvents.byUser(USER_ID))
    expect(invalidateEventProjectionQueries).toHaveBeenCalledWith(expect.anything(), EVENT_ID)
  })

  it("removes from the calendar when already saved", async () => {
    const client = makeQueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useToggleCalendarEvent(USER_ID), {
      wrapper: wrapper(client),
    })

    result.current.mutate({ eventId: EVENT_ID, isInCalendar: true })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(removeFromCalendar).toHaveBeenCalledWith(USER_ID, EVENT_ID)
    expect(addToCalendar).not.toHaveBeenCalled()
    expect(result.current.data).toBe(false)

    const invalidated = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidated).toContainEqual(qk.calendarEvents.byUser(USER_ID))
    expect(invalidateEventProjectionQueries).toHaveBeenCalledWith(expect.anything(), EVENT_ID)
  })

  it("does not invalidate anything when the calendar API rejects", async () => {
    vi.mocked(addToCalendar).mockRejectedValueOnce(new Error("nope"))
    const client = makeQueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useToggleCalendarEvent(USER_ID), {
      wrapper: wrapper(client),
    })

    result.current.mutate({ eventId: EVENT_ID, isInCalendar: false })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(spy).not.toHaveBeenCalled()
    expect(invalidateEventProjectionQueries).not.toHaveBeenCalled()
  })

  it("rejects without calling the API when there is no signed-in user", async () => {
    const client = makeQueryClient()
    const { result } = renderHook(() => useToggleCalendarEvent(undefined), {
      wrapper: wrapper(client),
    })

    result.current.mutate({ eventId: EVENT_ID, isInCalendar: false })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toContain("signed in")
    expect(addToCalendar).not.toHaveBeenCalled()
    expect(removeFromCalendar).not.toHaveBeenCalled()
    expect(invalidateEventProjectionQueries).not.toHaveBeenCalled()
  })
})
