import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import {
  addToCalendar,
  listCalendarEvents,
  removeFromCalendar,
} from "@/features/events/api/calendar"
import { invalidateEventProjectionQueries } from "@/features/events/lib/event-cache"

export function useCalendarEvents(userId: string | undefined) {
  return useQuery({
    queryKey: qk.calendarEvents.byUser(userId),
    queryFn: async () => {
      if (!userId) return []
      return listCalendarEvents(userId)
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
        await removeFromCalendar(userId, eventId)
        return false
      }
      await addToCalendar(userId, eventId, notes ?? null)
      return true
    },
    onSuccess: (_isNowInCalendar, variables) => {
      void queryClient.invalidateQueries({ queryKey: qk.calendarEvents.byUser(userId) })
      invalidateEventProjectionQueries(queryClient, variables.eventId)
    },
  })
}
