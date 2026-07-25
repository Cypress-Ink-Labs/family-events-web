import { supabase } from "@/infrastructure/supabase/client"
import type { Comment } from "@/shared/types"
import type { AdminComment } from "@/features/admin/types"

export type AdminCommentFilter = "all" | "pending" | "flagged" | "approved"

export interface AdminCommentPage {
  rows: AdminComment[]
  totalCount: number
}

const ADMIN_COMMENT_PAGE_SIZE = 50
const ADMIN_COMMENT_COLUMNS =
  "id, user_id, event_id, body, is_approved, is_flagged, created_at, updated_at, user_profiles(display_name), events(title)"

export async function listAdminComments(
  page: number,
  filter: AdminCommentFilter
): Promise<AdminCommentPage> {
  let query = supabase.from("comments").select(ADMIN_COMMENT_COLUMNS, { count: "exact" })

  switch (filter) {
    case "flagged":
      query = query.eq("is_flagged", true)
      break
    case "pending":
      query = query.eq("is_approved", false).eq("is_flagged", false)
      break
    case "approved":
      query = query.eq("is_approved", true).eq("is_flagged", false)
      break
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(
      page * ADMIN_COMMENT_PAGE_SIZE,
      page * ADMIN_COMMENT_PAGE_SIZE + ADMIN_COMMENT_PAGE_SIZE - 1
    )
  if (error) throw error
  return { rows: (data ?? []) as AdminComment[], totalCount: count ?? 0 }
}

export async function updateAdminComment(
  commentId: string,
  updates: Partial<Pick<Comment, "is_approved" | "is_flagged">>
): Promise<void> {
  const { error } = await supabase.from("comments").update(updates).eq("id", commentId)
  if (error) throw error
}

export async function deleteAdminComment(commentId: string): Promise<void> {
  const { error } = await supabase.from("comments").delete().eq("id", commentId)
  if (error) throw error
}
