import { supabase } from "@/infrastructure/supabase/client"
import type { City } from "@/shared/types"

const CITY_COLUMNS =
  "id, name, state, country, slug, is_active, latitude, longitude, timezone, created_at"

export async function listAdminCities(): Promise<City[]> {
  const { data, error } = await supabase
    .from("cities")
    .select(CITY_COLUMNS)
    .order("name", { ascending: true })
  if (error) throw error
  return data ?? []
}

export type AdminCityCreateInput = Omit<
  City,
  "id" | "created_at" | "latitude" | "longitude" | "is_active"
>

export async function createAdminCity(payload: AdminCityCreateInput): Promise<void> {
  const { error } = await supabase.from("cities").insert({
    ...payload,
    latitude: null,
    longitude: null,
    is_active: true,
  })
  if (error) throw error
}

export async function updateAdminCity(
  cityId: string,
  updates: Partial<Omit<City, "id" | "created_at">>
): Promise<void> {
  const { error } = await supabase.from("cities").update(updates).eq("id", cityId)
  if (error) throw error
}
