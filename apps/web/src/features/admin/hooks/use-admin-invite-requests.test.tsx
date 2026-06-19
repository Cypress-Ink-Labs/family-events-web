// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"

vi.mock("@/features/admin/api/invite-requests", () => ({
  approveInviteRequest: vi.fn().mockResolvedValue({ inviteCode: "ABC123" }),
  rejectInviteRequest: vi.fn().mockResolvedValue(true),
  listInviteRequests: vi.fn(),
}))

import { approveInviteRequest, rejectInviteRequest } from "@/features/admin/api/invite-requests"
import {
  useAdminApproveInviteRequest,
  useAdminRejectInviteRequest,
} from "./use-admin-invite-requests"

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

afterEach(() => vi.clearAllMocks())

describe("useAdminApproveInviteRequest", () => {
  it("calls approveInviteRequest and invalidates the request queues + invite codes", async () => {
    const client = new QueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useAdminApproveInviteRequest(), {
      wrapper: wrapper(client),
    })

    result.current.mutate("req-1")

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(approveInviteRequest).toHaveBeenCalledWith("req-1")
    const invalidated = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidated).toContainEqual(qk.admin.inviteRequests())
    expect(invalidated).toContainEqual(qk.admin.inviteRequests("all"))
    expect(invalidated).toContainEqual(qk.admin.inviteCodes)
  })
})

describe("useAdminRejectInviteRequest", () => {
  it("calls rejectInviteRequest and invalidates only the request queues", async () => {
    const client = new QueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useAdminRejectInviteRequest(), { wrapper: wrapper(client) })

    const payload = { requestId: "req-1", notes: "spam" }
    result.current.mutate(payload)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(rejectInviteRequest).toHaveBeenCalledWith(payload)
    const invalidated = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidated).toContainEqual(qk.admin.inviteRequests())
    expect(invalidated).toContainEqual(qk.admin.inviteRequests("all"))
    // reject does NOT mint a code, so it must not refresh the invite-codes cache
    expect(invalidated).not.toContainEqual(qk.admin.inviteCodes)
  })
})
