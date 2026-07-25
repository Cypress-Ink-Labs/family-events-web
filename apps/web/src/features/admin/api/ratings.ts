import { supabase } from "@/infrastructure/supabase/client"
import type { AdminRating } from "@/features/admin/types"

export interface AdminRatingPage {
  rows: AdminRating[]
  totalCount: number
}

const ADMIN_RATING_PAGE_SIZE = 50
const ADMIN_RATING_COLUMNS =
  "id, user_id, event_id, score, created_at, user_profiles(display_name), events(title)"

export async function listAdminRatings(page: number): Promise<AdminRatingPage> {
  const { data, count, error } = await supabase
    .from("ratings")
    .select(ADMIN_RATING_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(
      page * ADMIN_RATING_PAGE_SIZE,
      page * ADMIN_RATING_PAGE_SIZE + ADMIN_RATING_PAGE_SIZE - 1
    )
  if (error) throw error
  return { rows: (data ?? []) as AdminRating[], totalCount: count ?? 0 }
}

export async function deleteAdminRating(ratingId: string): Promise<void> {
  const { error } = await supabase.from("ratings").delete().eq("id", ratingId)
  if (error) throw error
}
