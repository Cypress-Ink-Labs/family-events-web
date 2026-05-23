import { useQuery } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import { supabase } from "@/infrastructure/supabase/client"
import type { City } from "@/shared/types"

export const ACTIVE_CITIES_QUERY_KEY = qk.cities.active

async function fetchActiveCities(): Promise<City[]> {
  const { data, error } = await supabase
    .from("cities")
    .select("id, name, state, country, slug, is_active, latitude, longitude, timezone, created_at")
    .eq("is_active", true)
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export function useCities() {
  return useQuery({
    queryKey: qk.cities.active,
    queryFn: fetchActiveCities,
  })
}
