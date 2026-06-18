// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"

vi.mock("@/features/admin/api/events", () => ({
  batchUpdateAdminEventStatus: vi.fn().mockResolvedValue(undefined),
  deleteAdminEvents: vi.fn().mockResolvedValue(undefined),
  fetchAdminEventFacets: vi.fn(),
  updateAdminEventStatus: vi.fn(),
}))

import { batchUpdateAdminEventStatus, deleteAdminEvents } from "@/features/admin/api/events"
import { useBatchUpdateAdminEventStatus, useDeleteAdminEvents } from "./use-admin-events"

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

afterEach(() => vi.clearAllMocks())

describe("useBatchUpdateAdminEventStatus", () => {
  it("calls the API and invalidates the admin/events/stats caches on success", async () => {
    const client = new QueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useBatchUpdateAdminEventStatus(), {
      wrapper: wrapper(client),
    })

    result.current.mutate({ eventIds: ["e1", "e2"], status: "published" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(batchUpdateAdminEventStatus).toHaveBeenCalledWith(["e1", "e2"], "published")
    const invalidated = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidated).toContainEqual(qk.admin.events.all)
    expect(invalidated).toContainEqual(qk.events.all)
    expect(invalidated).toContainEqual(qk.events.detailAll)
    expect(invalidated).toContainEqual(qk.admin.stats)
  })
})

describe("useDeleteAdminEvents", () => {
  it("calls deleteAdminEvents and invalidates the same caches on success", async () => {
    const client = new QueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useDeleteAdminEvents(), { wrapper: wrapper(client) })

    result.current.mutate(["e1", "e2", "e3"])

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deleteAdminEvents).toHaveBeenCalledWith(["e1", "e2", "e3"])
    const invalidated = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidated).toContainEqual(qk.admin.events.all)
    expect(invalidated).toContainEqual(qk.admin.stats)
  })
})
