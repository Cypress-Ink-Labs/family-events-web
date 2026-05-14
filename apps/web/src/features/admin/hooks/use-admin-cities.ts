import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { supabase } from "@/lib/supabase"
import type { City } from "@/lib/types"

export function useAdminCities() {
  return useQuery({
    queryKey: qk.admin.cities,
    queryFn: async (): Promise<City[]> => {
      const { data, error } = await supabase
        .from("cities")
        .select(
          "id, name, state, country, slug, is_active, latitude, longitude, timezone, created_at"
        )
        .order("name", { ascending: true })
      if (error) {
        throw error
      }
      return data ?? []
    },
  })
}

export function useCreateAdminCity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      payload: Omit<City, "id" | "created_at" | "latitude" | "longitude" | "is_active">
    ) => {
      const { error } = await supabase.from("cities").insert({
        ...payload,
        latitude: null,
        longitude: null,
        is_active: true,
      })
      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.cities })
      void queryClient.invalidateQueries({ queryKey: qk.cities.active })
    },
  })
}

export function useUpdateAdminCity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      cityId,
      updates,
    }: {
      cityId: string
      updates: Partial<Omit<City, "id" | "created_at">>
    }) => {
      const { error } = await supabase.from("cities").update(updates).eq("id", cityId)
      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.cities })
      void queryClient.invalidateQueries({ queryKey: qk.cities.active })
    },
  })
}
