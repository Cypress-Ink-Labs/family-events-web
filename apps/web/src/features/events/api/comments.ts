import { supabase } from "@/infrastructure/supabase/client"
import type { CommentWithProfile } from "@/lib/types"

const COMMENT_COLUMNS =
  "id, user_id, event_id, body, is_approved, is_flagged, created_at, updated_at, user_profiles(display_name, avatar_url)"

export async function listEventComments(eventId: string): Promise<CommentWithProfile[]> {
  const { data, error } = await supabase
    .from("comments")
    .select(COMMENT_COLUMNS)
    .eq("event_id", eventId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as CommentWithProfile[]
}

export interface AddCommentInput {
  userId: string
  eventId: string
  body: string
}

export async function addEventComment({ userId, eventId, body }: AddCommentInput) {
  const { data, error } = await supabase
    .from("comments")
    .insert({
      user_id: userId,
      event_id: eventId,
      body,
      is_approved: true,
      is_flagged: false,
    })
    .select("id, user_id, event_id, body, is_approved, is_flagged, created_at, updated_at")
    .single()
  if (error) throw error
  return data
}
