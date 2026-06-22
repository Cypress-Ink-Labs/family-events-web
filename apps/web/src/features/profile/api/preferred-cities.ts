import { supabase } from "@/infrastructure/supabase/client"
import type { Database } from "@/lib/db"

/**
 * Data-access layer for the `public.user_preferred_cities` table and the
 * `set_preferred_cities` RPC. Hooks call into these helpers; raw Supabase IO
 * does not leak past this module. Each helper throws on Supabase error so the
 * caller can route it to TanStack Query's onError path.
 */

export type PreferredCityRow = Database["public"]["Tables"]["user_preferred_cities"]["Row"]

/** Fetch every preferred-city row the signed-in user owns (RLS scopes to owner). */
export async function listPreferredCities(userId: string): Promise<PreferredCityRow[]> {
  const { data, error } = await supabase
    .from("user_preferred_cities")
    .select("user_id, city_id, is_primary, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return data ?? []
}

/**
 * Replace the user's preferred-city set so exactly `cityIds` remain with
 * `primaryCityId` as the single primary, and mirror
 * `user_profiles.city_preference_id` to it — all atomically, in one
 * transaction, via the `set_preferred_cities` RPC (backend CIL-187). The RPC
 * runs under the caller's RLS (`auth.uid()`) and itself rejects a primary
 * outside the set; the client-side check below just surfaces a friendlier
 * message before the round-trip.
 */
export async function savePreferredCities(
  cityIds: readonly string[],
  primaryCityId: string
): Promise<void> {
  const uniqueCityIds = Array.from(new Set(cityIds))

  if (!uniqueCityIds.includes(primaryCityId)) {
    throw new Error("The primary city must be one of the selected cities.")
  }

  const { error } = await supabase.rpc("set_preferred_cities", {
    p_city_ids: uniqueCityIds,
    p_primary_city_id: primaryCityId,
  })
  if (error) throw error
}
