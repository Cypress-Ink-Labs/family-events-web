// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"

vi.mock("@/features/admin/api/ratings", () => ({
  deleteAdminRating: vi.fn().mockResolvedValue(undefined),
  listAdminRatings: vi.fn(),
}))

import { deleteAdminRating } from "@/features/admin/api/ratings"
import { useDeleteAdminRating } from "./use-admin-ratings"

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

afterEach(() => vi.clearAllMocks())

describe("useDeleteAdminRating", () => {
  it("calls deleteAdminRating and invalidates the rating + event caches", async () => {
    const client = new QueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useDeleteAdminRating(), { wrapper: wrapper(client) })

    result.current.mutate({ ratingId: "r1" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deleteAdminRating).toHaveBeenCalledWith("r1")
    const invalidated = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidated).toContainEqual(qk.admin.ratings)
    expect(invalidated).toContainEqual(qk.ratings.all)
    expect(invalidated).toContainEqual(qk.events.all)
    expect(invalidated).toContainEqual(qk.events.detailAll)
  })
})
