import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import { subscribeToCommentChanges } from "@/features/events/lib/comments-channel-registry"
import { addEventComment, listEventComments } from "@/features/events/api/comments"

export function useComments(eventId: string | undefined) {
  const queryClient = useQueryClient()
  const commentsQueryKey = qk.comments.byEvent(eventId)

  // Multiple useComments(eventId) mounts share one Supabase channel via the
  // registry, avoiding the prior "two-channel" cost when two components
  // subscribe to the same event. The registry handles CHANNEL_ERROR
  // reconnection internally.
  useEffect(() => {
    if (!eventId) return
    return subscribeToCommentChanges(eventId, () => {
      void queryClient.invalidateQueries({ queryKey: qk.comments.byEvent(eventId) })
    })
  }, [eventId, queryClient])

  return useQuery({
    queryKey: commentsQueryKey,
    queryFn: async () => {
      if (!eventId) return []
      return listEventComments(eventId)
    },
    enabled: Boolean(eventId),
  })
}

interface AddCommentInput {
  eventId: string
  body: string
}

export function useAddComment(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, body }: AddCommentInput) => {
      if (!userId) {
        throw new Error("You must be signed in to comment.")
      }
      return addEventComment({ userId, eventId, body })
    },
    onSuccess: (_comment, variables) => {
      void queryClient.invalidateQueries({ queryKey: qk.comments.byEvent(variables.eventId) })
    },
  })
}
