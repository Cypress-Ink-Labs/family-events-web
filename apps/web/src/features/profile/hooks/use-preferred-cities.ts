import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import { useCities } from "@/shared/hooks/use-cities"
import type { City } from "@/shared/types"
import {
  listPreferredCities,
  savePreferredCities,
  type PreferredCityRow,
} from "@/features/profile/api/preferred-cities"
import { useUpdateProfile } from "@/features/profile/hooks/use-profile"

export interface PreferredCity {
  cityId: string
  isPrimary: boolean
  /** Resolved from the active cities list; null while cities load or if inactive. */
  city: City | null
}

/**
 * Fetch the signed-in user's preferred cities (RLS scopes to owner) and resolve
 * each row against the active cities list so the UI has display names without a
 * second round-trip. Primary city sorts first, then alphabetically by name.
 */
export function usePreferredCities(userId: string | undefined) {
  const { data: cities = [] } = useCities()

  const query = useQuery({
    queryKey: qk.userPreferredCities.byUser(userId),
    queryFn: async (): Promise<PreferredCityRow[]> => {
      if (!userId) return []
      return listPreferredCities(userId)
    },
    enabled: Boolean(userId),
  })

  const cityById = useMemo(() => {
    const map = new Map<string, City>()
    for (const city of cities) map.set(city.id, city)
    return map
  }, [cities])

  const rows = useMemo(() => query.data ?? [], [query.data])

  const preferredCities = useMemo<PreferredCity[]>(() => {
    return rows
      .map((row) => ({
        cityId: row.city_id,
        isPrimary: row.is_primary,
        city: cityById.get(row.city_id) ?? null,
      }))
      .toSorted((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
        return (a.city?.name ?? "").localeCompare(b.city?.name ?? "")
      })
  }, [rows, cityById])

  const primaryCityId = useMemo(() => rows.find((row) => row.is_primary)?.city_id ?? null, [rows])

  return {
    ...query,
    preferredCities,
    primaryCityId,
  }
}

export interface SavePreferredCitiesInput {
  cityIds: readonly string[]
  primaryCityId: string
}

/**
 * Persist the user's preferred-city set with exactly one primary, then mirror
 * `user_profiles.city_preference_id` to that primary (the compatibility field
 * the backend still reads as a fallback). The set-replacement write sequences
 * its statements so the partial unique index on `is_primary` is never violated.
 *
 * On success the caller should invalidate via the returned mutation's
 * onSuccess (preferred-cities + user-profile keys are invalidated here).
 */
export function useSavePreferredCities(userId: string | undefined) {
  const queryClient = useQueryClient()
  const updateProfile = useUpdateProfile(userId)

  return useMutation({
    mutationFn: async ({ cityIds, primaryCityId }: SavePreferredCitiesInput) => {
      if (!userId) {
        throw new Error("You must be signed in to update your preferred cities.")
      }

      await savePreferredCities(userId, cityIds, primaryCityId)
      // Mirror the primary into the compatibility column the backend reads.
      await updateProfile.mutateAsync({ city_preference_id: primaryCityId })

      return { cityIds: Array.from(new Set(cityIds)), primaryCityId }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: qk.userPreferredCities.byUser(userId),
      })
      void queryClient.invalidateQueries({ queryKey: qk.userProfile.byUser(userId) })
    },
  })
}
