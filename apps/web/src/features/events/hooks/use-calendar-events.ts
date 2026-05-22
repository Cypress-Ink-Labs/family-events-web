import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { supabase } from "@/lib/supabase"
import type { UserCalendarEvent } from "@/lib/types"
import { invalidateEventProjectionQueries } from "@/features/events/lib/event-cache"

export function useCalendarEvents(userId: string | undefined) {
  return useQuery({
    queryKey: qk.calendarEvents.byUser(userId),
    queryFn: async (): Promise<UserCalendarEvent[]> => {
      if (!userId) {
        return []
      }

      const { data, error } = await supabase
        .from("user_calendar_events")
        .select("id, user_id, event_id, added_at, notes")
        .eq("user_id", userId)
        .order("added_at", { ascending: false })

      if (error) {
        throw error
      }

      return data ?? []
    },
    enabled: Boolean(userId),
  })
}

interface ToggleCalendarEventInput {
  eventId: string
  isInCalendar: boolean
  notes?: string | null
}

export function useToggleCalendarEvent(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, isInCalendar, notes }: ToggleCalendarEventInput) => {
      if (!userId) {
        throw new Error("You must be signed in to save calendar events.")
      }

      if (isInCalendar) {
        const { error } = await supabase
          .from("user_calendar_events")
          .delete()
          .eq("user_id", userId)
          .eq("event_id", eventId)

        if (error) {
          throw error
        }

        return false
      }

      const { error } = await supabase.from("user_calendar_events").insert({
        user_id: userId,
        event_id: eventId,
        notes: notes ?? null,
      })

      if (error) {
        throw error
      }

      return true
    },
    onSuccess: (_isNowInCalendar, variables) => {
      void queryClient.invalidateQueries({ queryKey: qk.calendarEvents.byUser(userId) })
      invalidateEventProjectionQueries(queryClient, variables.eventId)
    },
  })
}
