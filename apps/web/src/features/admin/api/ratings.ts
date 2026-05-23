import { supabase } from "@/lib/supabase/client"
import type { AdminRating } from "@/features/admin/types"

const ADMIN_RATING_COLUMNS =
  "id, user_id, event_id, score, created_at, user_profiles(display_name), events(title)"

export async function listAdminRatings(): Promise<AdminRating[]> {
  const { data, error } = await supabase
    .from("ratings")
    .select(ADMIN_RATING_COLUMNS)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as AdminRating[]
}

export async function deleteAdminRating(ratingId: string): Promise<void> {
  const { error } = await supabase.from("ratings").delete().eq("id", ratingId)
  if (error) throw error
}
