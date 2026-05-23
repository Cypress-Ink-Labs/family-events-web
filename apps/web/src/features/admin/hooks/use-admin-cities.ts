import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import {
  type AdminCityCreateInput,
  createAdminCity,
  listAdminCities,
  updateAdminCity,
} from "@/features/admin/api/cities"
import type { City } from "@/shared/types"

export function useAdminCities() {
  return useQuery({
    queryKey: qk.admin.cities,
    queryFn: listAdminCities,
  })
}

export function useCreateAdminCity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AdminCityCreateInput) => createAdminCity(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.cities })
      void queryClient.invalidateQueries({ queryKey: qk.cities.active })
    },
  })
}

export function useUpdateAdminCity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      cityId,
      updates,
    }: {
      cityId: string
      updates: Partial<Omit<City, "id" | "created_at">>
    }) => updateAdminCity(cityId, updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.cities })
      void queryClient.invalidateQueries({ queryKey: qk.cities.active })
    },
  })
}
