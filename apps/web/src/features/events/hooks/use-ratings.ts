import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import {
  getUserEventRating,
  upsertEventRating,
} from "@/features/events/api/ratings"
import { invalidateEventProjectionQueries } from "@/features/events/lib/event-cache"


export function useUserRating(userId: string | undefined, eventId: string | undefined) {
  return useQuery({
    queryKey: qk.ratings.userEvent(userId, eventId),
    queryFn: async () => {
      if (!userId || !eventId) return null
      return getUserEventRating(userId, eventId)
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
    mutationFn: ({ eventId, score }: UpsertRatingInput) => {
      if (!userId) {
        throw new Error("You must be signed in to rate events.")
      }
      return upsertEventRating({ userId, eventId, score })
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
