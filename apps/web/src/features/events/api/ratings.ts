import { supabase } from "@/infrastructure/supabase/client"
import type { Rating } from "@/shared/types"

const RATING_COLUMNS = "id, user_id, event_id, score, created_at"

export async function getUserEventRating(userId: string, eventId: string): Promise<Rating | null> {
  const { data, error } = await supabase
    .from("ratings")
    .select(RATING_COLUMNS)
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

export interface UpsertRatingInput {
  userId: string
  eventId: string
  score: number
}

export async function upsertEventRating({ userId, eventId, score }: UpsertRatingInput) {
  const { data, error } = await supabase
    .from("ratings")
    .upsert({ user_id: userId, event_id: eventId, score }, { onConflict: "user_id,event_id" })
    .select(RATING_COLUMNS)
    .single()
  if (error) throw error
  return data
}
