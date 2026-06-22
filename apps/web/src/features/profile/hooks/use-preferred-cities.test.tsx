// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import type { City } from "@/shared/types"

const { listPreferredCities, savePreferredCities } = vi.hoisted(() => ({
  listPreferredCities: vi.fn(),
  savePreferredCities: vi.fn(),
}))

vi.mock("@/features/profile/api/preferred-cities", () => ({
  listPreferredCities,
  savePreferredCities,
}))

const { useCities } = vi.hoisted(() => ({ useCities: vi.fn() }))
vi.mock("@/shared/hooks/use-cities", () => ({ useCities }))

// useUpdateProfile mirrors city_preference_id; capture its calls via this mock.
const { updateProfileMutateAsync, useUpdateProfile } = vi.hoisted(() => {
  const updateProfileMutateAsync = vi.fn()
  const useUpdateProfile = vi.fn(() => ({ mutateAsync: updateProfileMutateAsync }))
  return { updateProfileMutateAsync, useUpdateProfile }
})
vi.mock("@/features/profile/hooks/use-profile", () => ({ useUpdateProfile }))

import { usePreferredCities, useSavePreferredCities } from "./use-preferred-cities"

const USER_ID = "user-1"

const CITIES: City[] = [
  { id: "city-a", name: "Austin", state: "TX" } as City,
  { id: "city-b", name: "Boston", state: "MA" } as City,
  { id: "city-c", name: "Chicago", state: "IL" } as City,
]

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

afterEach(() => vi.clearAllMocks())

describe("usePreferredCities", () => {
  it("resolves rows against active cities with the primary sorted first", async () => {
    useCities.mockReturnValue({ data: CITIES })
    listPreferredCities.mockResolvedValue([
      { user_id: USER_ID, city_id: "city-b", is_primary: false, created_at: "t1" },
      { user_id: USER_ID, city_id: "city-c", is_primary: true, created_at: "t2" },
    ])

    const client = makeQueryClient()
    const { result } = renderHook(() => usePreferredCities(USER_ID), { wrapper: wrapper(client) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.primaryCityId).toBe("city-c")
    // Primary first, then alphabetical by resolved name.
    expect(result.current.preferredCities.map((c) => c.cityId)).toEqual(["city-c", "city-b"])
    expect(result.current.preferredCities[0]?.city?.name).toBe("Chicago")
  })

  it("returns an empty set and no primary when the user has no rows", async () => {
    useCities.mockReturnValue({ data: CITIES })
    listPreferredCities.mockResolvedValue([])

    const client = makeQueryClient()
    const { result } = renderHook(() => usePreferredCities(USER_ID), { wrapper: wrapper(client) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.preferredCities).toEqual([])
    expect(result.current.primaryCityId).toBeNull()
  })

  it("does not query when there is no signed-in user", () => {
    useCities.mockReturnValue({ data: CITIES })

    const client = makeQueryClient()
    renderHook(() => usePreferredCities(undefined), { wrapper: wrapper(client) })

    expect(listPreferredCities).not.toHaveBeenCalled()
  })
})

describe("useSavePreferredCities", () => {
  it("persists the set and mirrors city_preference_id to the primary", async () => {
    useCities.mockReturnValue({ data: CITIES })
    savePreferredCities.mockResolvedValue(undefined)
    updateProfileMutateAsync.mockResolvedValue({ id: USER_ID })

    const client = makeQueryClient()
    const { result } = renderHook(() => useSavePreferredCities(USER_ID), {
      wrapper: wrapper(client),
    })

    result.current.mutate({ cityIds: ["city-a", "city-b"], primaryCityId: "city-b" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(savePreferredCities).toHaveBeenCalledWith(USER_ID, ["city-a", "city-b"], "city-b")
    // Mirror write: the compatibility column tracks the primary.
    expect(updateProfileMutateAsync).toHaveBeenCalledWith({ city_preference_id: "city-b" })
  })

  it("invalidates preferred-cities and user-profile caches on success", async () => {
    useCities.mockReturnValue({ data: CITIES })
    savePreferredCities.mockResolvedValue(undefined)
    updateProfileMutateAsync.mockResolvedValue({ id: USER_ID })

    const client = makeQueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useSavePreferredCities(USER_ID), {
      wrapper: wrapper(client),
    })

    result.current.mutate({ cityIds: ["city-a"], primaryCityId: "city-a" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const invalidated = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidated).toContainEqual(qk.userPreferredCities.byUser(USER_ID))
    expect(invalidated).toContainEqual(qk.userProfile.byUser(USER_ID))
  })

  it("surfaces the save error and never mirrors when the set write fails", async () => {
    useCities.mockReturnValue({ data: CITIES })
    savePreferredCities.mockRejectedValue(new Error("row-level security"))

    const client = makeQueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useSavePreferredCities(USER_ID), {
      wrapper: wrapper(client),
    })

    result.current.mutate({ cityIds: ["city-a"], primaryCityId: "city-a" })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(updateProfileMutateAsync).not.toHaveBeenCalled()
    expect(spy).not.toHaveBeenCalled()
  })

  it("rejects without writing when there is no signed-in user", async () => {
    useCities.mockReturnValue({ data: CITIES })

    const client = makeQueryClient()
    const { result } = renderHook(() => useSavePreferredCities(undefined), {
      wrapper: wrapper(client),
    })

    result.current.mutate({ cityIds: ["city-a"], primaryCityId: "city-a" })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toContain("signed in")
    expect(savePreferredCities).not.toHaveBeenCalled()
  })
})
