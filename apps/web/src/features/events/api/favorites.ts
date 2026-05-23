import { supabase } from "@/infrastructure/supabase/client"
import type { Favorite } from "@/shared/types"

/**
 * Data-access layer for the `favorites` table. Hooks call into these
 * functions; raw Supabase IO does not leak past this module.
 *
 * Each helper throws on Supabase error so the calling hook can hand the
 * error to TanStack Query's onError path.
 */

export async function listFavoritesForUser(userId: string): Promise<Favorite[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select("id, user_id, event_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function removeFavorite(userId: string, eventId: string): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("event_id", eventId)
  if (error) throw error
}

export async function addFavorite(userId: string, eventId: string): Promise<void> {
  const { error } = await supabase.from("favorites").insert({ user_id: userId, event_id: eventId })
  if (error) throw error
}
