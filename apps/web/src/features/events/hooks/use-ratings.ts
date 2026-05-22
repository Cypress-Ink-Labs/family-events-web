import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { supabase } from "@/lib/supabase"
import type { Rating } from "@/lib/types"
import { invalidateEventProjectionQueries } from "@/features/events/lib/event-cache"

export function useRatings(eventId: string | undefined) {
  return useQuery({
    queryKey: qk.ratings.byEvent(eventId),
    queryFn: async (): Promise<Rating[]> => {
      if (!eventId) {
        return []
      }

      const { data, error } = await supabase
        .from("ratings")
        .select("id, user_id, event_id, score, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      return data ?? []
    },
    enabled: Boolean(eventId),
  })
}

export function useUserRating(userId: string | undefined, eventId: string | undefined) {
  return useQuery({
    queryKey: qk.ratings.userEvent(userId, eventId),
    queryFn: async (): Promise<Rating | null> => {
      if (!userId || !eventId) {
        return null
      }

      const { data, error } = await supabase
        .from("ratings")
        .select("id, user_id, event_id, score, created_at")
        .eq("user_id", userId)
        .eq("event_id", eventId)
        .maybeSingle()

      if (error) {
        throw error
      }

      return data ?? null
    },
    enabled: Boolean(userId && eventId),
  })
}

interface UpsertRatingInput {
  eventId: string
  score: number
}

export function useUpsertRating(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, score }: UpsertRatingInput) => {
      if (!userId) {
        throw new Error("You must be signed in to rate events.")
      }

      const { data, error } = await supabase
        .from("ratings")
        .upsert(
          {
            user_id: userId,
            event_id: eventId,
            score,
          },
          { onConflict: "user_id,event_id" }
        )
        .select("id, user_id, event_id, score, created_at")
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: (_rating, variables) => {
      void queryClient.invalidateQueries({ queryKey: qk.ratings.byEvent(variables.eventId) })
      void queryClient.invalidateQueries({
        queryKey: qk.ratings.userEvent(userId, variables.eventId),
      })
      invalidateEventProjectionQueries(queryClient, variables.eventId)
    },
  })
}
