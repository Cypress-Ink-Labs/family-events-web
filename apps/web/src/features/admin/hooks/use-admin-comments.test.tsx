// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"

vi.mock("@/features/admin/api/comments", () => ({
  updateAdminComment: vi.fn().mockResolvedValue(undefined),
  deleteAdminComment: vi.fn().mockResolvedValue(undefined),
  listAdminComments: vi.fn(),
}))

import { deleteAdminComment, updateAdminComment } from "@/features/admin/api/comments"
import { useDeleteAdminComment, useUpdateAdminComment } from "./use-admin-comments"

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

afterEach(() => vi.clearAllMocks())

describe("useUpdateAdminComment", () => {
  it("calls updateAdminComment and invalidates the admin + public comment caches", async () => {
    const client = new QueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useUpdateAdminComment(), { wrapper: wrapper(client) })

    result.current.mutate({ commentId: "c1", updates: { is_approved: true } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(updateAdminComment).toHaveBeenCalledWith("c1", { is_approved: true })
    const invalidated = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidated).toContainEqual(qk.admin.comments)
    expect(invalidated).toContainEqual(qk.comments.all)
  })
})

describe("useDeleteAdminComment", () => {
  it("calls deleteAdminComment and invalidates the admin + public comment caches", async () => {
    const client = new QueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useDeleteAdminComment(), { wrapper: wrapper(client) })

    result.current.mutate({ commentId: "c1" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deleteAdminComment).toHaveBeenCalledWith("c1")
    const invalidated = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidated).toContainEqual(qk.admin.comments)
    expect(invalidated).toContainEqual(qk.comments.all)
  })
})
