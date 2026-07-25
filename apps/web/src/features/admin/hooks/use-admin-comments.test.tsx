// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import type { AdminComment } from "@/features/admin/types"

vi.mock("@/features/admin/api/comments", () => ({
  updateAdminComment: vi.fn().mockResolvedValue(undefined),
  deleteAdminComment: vi.fn().mockResolvedValue(undefined),
  listAdminComments: vi.fn(),
}))

import {
  deleteAdminComment,
  listAdminComments,
  updateAdminComment,
  type AdminCommentPage,
} from "@/features/admin/api/comments"
import {
  useAdminComments,
  useDeleteAdminComment,
  useUpdateAdminComment,
} from "./use-admin-comments"

type CommentQueryArgs = { page: number; filter: "all" | "flagged" }

const firstPage: AdminCommentPage = {
  rows: [{ id: "comment-page-1" } as AdminComment],
  totalCount: 101,
}
const secondPage: AdminCommentPage = {
  rows: [{ id: "comment-page-2" } as AdminComment],
  totalCount: 101,
}
const flaggedPage: AdminCommentPage = {
  rows: [{ id: "flagged-comment-page-2" } as AdminComment],
  totalCount: 1,
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

describe("useAdminComments", () => {
  it("uses a page-and-filter query key while preserving prior rows during the next page load", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const nextPage = deferred<typeof secondPage>()
    vi.mocked(listAdminComments)
      .mockResolvedValueOnce(firstPage)
      .mockImplementationOnce(() => nextPage.promise)
      .mockResolvedValueOnce(flaggedPage)

    const initialProps: CommentQueryArgs = { page: 0, filter: "all" }
    const { result, rerender } = renderHook(
      ({ page, filter }: CommentQueryArgs) => useAdminComments(page, filter),
      {
        initialProps,
        wrapper: wrapper(client),
      }
    )

    await waitFor(() => expect(result.current.data).toEqual(firstPage))
    expect(listAdminComments).toHaveBeenCalledWith(0, "all")
    expect(client.getQueryData([...qk.admin.comments, 0, "all"])).toEqual(firstPage)

    rerender({ page: 1, filter: "all" })

    await waitFor(() => expect(listAdminComments).toHaveBeenLastCalledWith(1, "all"))
    expect(result.current.data).toEqual(firstPage)
    expect(result.current.isPlaceholderData).toBe(true)

    nextPage.resolve(secondPage)
    await waitFor(() => expect(result.current.data).toEqual(secondPage))

    rerender({ page: 1, filter: "flagged" })

    await waitFor(() => expect(listAdminComments).toHaveBeenLastCalledWith(1, "flagged"))
    await waitFor(() => expect(result.current.data).toEqual(flaggedPage))
    expect(client.getQueryData([...qk.admin.comments, 1, "flagged"])).toEqual(flaggedPage)
  })
})

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
