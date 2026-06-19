// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"

vi.mock("@/features/admin/api/access", () => ({
  setAdminUserAccess: vi.fn().mockResolvedValue(undefined),
  deleteAdminUser: vi.fn().mockResolvedValue(undefined),
  listAdminUserAccess: vi.fn(),
}))

// The module imports useAuth (for useAccountPermissions); stub it so importing
// the mutation hooks doesn't pull in the auth-store/supabase side effects.
vi.mock("@/features/auth/stores/auth-store", () => ({
  useAuth: vi.fn(() => ({ user: undefined })),
}))

import { deleteAdminUser, setAdminUserAccess } from "@/features/admin/api/access"
import { useDeleteAdminUser, useUpdateAdminUserAccess } from "./use-admin-access"

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

afterEach(() => vi.clearAllMocks())

describe("useUpdateAdminUserAccess", () => {
  it("calls setAdminUserAccess and invalidates the user-access cache", async () => {
    const client = new QueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useUpdateAdminUserAccess(), { wrapper: wrapper(client) })

    const input = { userId: "u1", isEnabled: false, disabledReason: "abuse" }
    result.current.mutate(input)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(setAdminUserAccess).toHaveBeenCalledWith(input)
    const invalidated = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidated).toContainEqual(qk.admin.userAccess)
  })
})

describe("useDeleteAdminUser", () => {
  it("calls deleteAdminUser and invalidates the user-access cache", async () => {
    const client = new QueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useDeleteAdminUser(), { wrapper: wrapper(client) })

    result.current.mutate("u1")

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deleteAdminUser).toHaveBeenCalledWith("u1")
    const invalidated = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidated).toContainEqual(qk.admin.userAccess)
  })
})
