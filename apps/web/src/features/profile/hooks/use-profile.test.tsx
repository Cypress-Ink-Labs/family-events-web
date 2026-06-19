// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"

// Chainable Supabase query-builder stub: from().update().eq().select().single().
// `single` is exposed so each test can swap its resolved { data, error }.
// vi.hoisted lets the vi.mock factory (hoisted to the top of the file) safely
// reference these spies — plain top-level consts would not yet be initialized.
const { single, eq, update, from } = vi.hoisted(() => {
  const single = vi.fn()
  const select = vi.fn(() => ({ single }))
  const eq = vi.fn(() => ({ select }))
  const update = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ update }))
  return { single, select, eq, update, from }
})

vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: { from, rpc: vi.fn() },
}))

import { useUpdateProfile } from "./use-profile"

const USER_ID = "user-1"

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

describe("useUpdateProfile", () => {
  it("updates the profile and invalidates the user-profile cache on success", async () => {
    const profile = { id: USER_ID, display_name: "New Name" }
    single.mockResolvedValue({ data: profile, error: null })

    const client = makeQueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useUpdateProfile(USER_ID), { wrapper: wrapper(client) })

    result.current.mutate({ display_name: "New Name" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(from).toHaveBeenCalledWith("user_profiles")
    expect(update).toHaveBeenCalledWith({ display_name: "New Name" })
    expect(eq).toHaveBeenCalledWith("id", USER_ID)
    expect(result.current.data).toEqual(profile)

    const invalidated = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidated).toContainEqual(qk.userProfile.byUser(USER_ID))
  })

  it("does not invalidate anything when the update returns an error", async () => {
    single.mockResolvedValue({ data: null, error: { message: "denied" } })

    const client = makeQueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useUpdateProfile(USER_ID), { wrapper: wrapper(client) })

    result.current.mutate({ display_name: "New Name" })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(spy).not.toHaveBeenCalled()
  })

  it("rejects without touching Supabase when there is no signed-in user", async () => {
    const client = makeQueryClient()
    const { result } = renderHook(() => useUpdateProfile(undefined), { wrapper: wrapper(client) })

    result.current.mutate({ display_name: "New Name" })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toContain("signed in")
    expect(from).not.toHaveBeenCalled()
  })
})
