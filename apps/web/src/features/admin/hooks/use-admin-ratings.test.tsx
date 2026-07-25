// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import type { AdminRating } from "@/features/admin/types"

vi.mock("@/features/admin/api/ratings", () => ({
  deleteAdminRating: vi.fn().mockResolvedValue(undefined),
  listAdminRatings: vi.fn(),
}))

import {
  deleteAdminRating,
  listAdminRatings,
  type AdminRatingPage,
} from "@/features/admin/api/ratings"
import { useAdminRatings, useDeleteAdminRating } from "./use-admin-ratings"

const firstPage: AdminRatingPage = {
  rows: [{ id: "rating-page-1" } as AdminRating],
  totalCount: 51,
}
const secondPage: AdminRatingPage = {
  rows: [{ id: "rating-page-2" } as AdminRating],
  totalCount: 51,
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

afterEach(() => vi.clearAllMocks())

describe("useAdminRatings", () => {
  it("uses a page-specific prefix-compatible key and preserves rows while the next page loads", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const nextPage = deferred<typeof secondPage>()
    vi.mocked(listAdminRatings)
      .mockResolvedValueOnce(firstPage)
      .mockImplementationOnce(() => nextPage.promise)

    const { result, rerender } = renderHook(({ page }: { page: number }) => useAdminRatings(page), {
      initialProps: { page: 0 },
      wrapper: wrapper(client),
    })

    await waitFor(() => expect(result.current.data).toEqual(firstPage))
    expect(listAdminRatings).toHaveBeenCalledWith(0)
    expect(client.getQueryData([...qk.admin.ratings, 0])).toEqual(firstPage)

    rerender({ page: 1 })

    await waitFor(() => expect(listAdminRatings).toHaveBeenLastCalledWith(1))
    expect(result.current.data).toEqual(firstPage)
    expect(result.current.isPlaceholderData).toBe(true)

    nextPage.resolve(secondPage)
    await waitFor(() => expect(result.current.data).toEqual(secondPage))
    expect(client.getQueryData([...qk.admin.ratings, 1])).toEqual(secondPage)
  })
})

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
