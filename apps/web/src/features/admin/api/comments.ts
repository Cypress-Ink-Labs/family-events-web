import { supabase } from "@/lib/supabase/client"
import type { Comment } from "@/lib/types"
import type { AdminComment } from "@/features/admin/types"

const ADMIN_COMMENT_COLUMNS =
  "id, user_id, event_id, body, is_approved, is_flagged, created_at, updated_at, user_profiles(display_name), events(title)"

export async function listAdminComments(): Promise<AdminComment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select(ADMIN_COMMENT_COLUMNS)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as AdminComment[]
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
