// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"

vi.mock("@/features/admin/api/event-editor", () => ({
  updateAdminEvent: vi.fn().mockResolvedValue({ id: "e1" }),
  createAdminEvent: vi.fn().mockResolvedValue({ id: "created-1" }),
  unlockAdminEventFields: vi.fn().mockResolvedValue("e1"),
}))

import {
  createAdminEvent,
  unlockAdminEventFields,
  updateAdminEvent,
} from "@/features/admin/api/event-editor"
import {
  useCreateAdminEvent,
  useUnlockAdminEventFields,
  useUpdateAdminEvent,
} from "./use-admin-event-editor"

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

afterEach(() => vi.clearAllMocks())

describe("useUpdateAdminEvent", () => {
  it("calls updateAdminEvent and invalidates the full admin/public event cache set", async () => {
    const client = new QueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useUpdateAdminEvent(), { wrapper: wrapper(client) })

    const input = { eventId: "e1", patch: {}, tagIds: ["t1"] }
    result.current.mutate(input)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(updateAdminEvent).toHaveBeenCalledWith(input)
    const invalidated = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidated).toContainEqual(qk.admin.events.all)
    expect(invalidated).toContainEqual(qk.events.all)
    expect(invalidated).toContainEqual(qk.events.detailAll)
    expect(invalidated).toContainEqual(qk.enrichedEvents.all)
    expect(invalidated).toContainEqual(qk.admin.events.detail("e1"))
    expect(invalidated).toContainEqual(qk.admin.eventAiTrace("e1"))
    expect(invalidated).toContainEqual(qk.events.detailById("e1"))
    expect(invalidated).toContainEqual(qk.admin.stats)
  })
})

describe("useCreateAdminEvent", () => {
  it("calls createAdminEvent and invalidates caches keyed by the created event id", async () => {
    const client = new QueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useCreateAdminEvent(), { wrapper: wrapper(client) })

    const input = { patch: {}, tagIds: ["t1"] }
    result.current.mutate(input)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(createAdminEvent).toHaveBeenCalledWith(input)
    const invalidated = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidated).toContainEqual(qk.admin.events.all)
    expect(invalidated).toContainEqual(qk.events.all)
    expect(invalidated).toContainEqual(qk.events.detailAll)
    expect(invalidated).toContainEqual(qk.enrichedEvents.all)
    expect(invalidated).toContainEqual(qk.admin.events.detail("created-1"))
    expect(invalidated).toContainEqual(qk.admin.eventAiTrace("created-1"))
    expect(invalidated).toContainEqual(qk.events.detailById("created-1"))
    expect(invalidated).toContainEqual(qk.admin.stats)
  })
})

describe("useUnlockAdminEventFields", () => {
  it("calls unlockAdminEventFields and invalidates the event caches (no stats)", async () => {
    const client = new QueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useUnlockAdminEventFields(), { wrapper: wrapper(client) })

    result.current.mutate("e1")

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(unlockAdminEventFields).toHaveBeenCalledWith("e1")
    const invalidated = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidated).toContainEqual(qk.admin.events.all)
    expect(invalidated).toContainEqual(qk.events.all)
    expect(invalidated).toContainEqual(qk.events.detailAll)
    expect(invalidated).toContainEqual(qk.enrichedEvents.all)
    expect(invalidated).toContainEqual(qk.admin.events.detail("e1"))
    expect(invalidated).toContainEqual(qk.admin.eventAiTrace("e1"))
    expect(invalidated).toContainEqual(qk.events.detailById("e1"))
    // unlock intentionally does NOT refresh admin stats
    expect(invalidated).not.toContainEqual(qk.admin.stats)
  })
})
