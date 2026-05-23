import { supabase } from "@/lib/supabase/client"
import type { UserCalendarEvent } from "@/lib/types"

const CALENDAR_COLUMNS = "id, user_id, event_id, added_at, notes"

export async function listCalendarEvents(userId: string): Promise<UserCalendarEvent[]> {
  const { data, error } = await supabase
    .from("user_calendar_events")
    .select(CALENDAR_COLUMNS)
    .eq("user_id", userId)
    .order("added_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function removeFromCalendar(userId: string, eventId: string): Promise<void> {
  const { error } = await supabase
    .from("user_calendar_events")
    .delete()
    .eq("user_id", userId)
    .eq("event_id", eventId)
  if (error) throw error
}

export async function addToCalendar(
  userId: string,
  eventId: string,
  notes: string | null = null
): Promise<void> {
  const { error } = await supabase.from("user_calendar_events").insert({
    user_id: userId,
    event_id: eventId,
    notes,
  })
  if (error) throw error
}
