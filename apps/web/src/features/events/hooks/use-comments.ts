import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { supabase } from "@/lib/supabase/client"
import { subscribeToCommentChanges } from "@/features/events/lib/comments-channel-registry"
import type { CommentWithProfile } from "@/lib/types"

export function useComments(eventId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!eventId) return
    // Multiple useComments(eventId) mounts share one Supabase channel via the
    // registry, avoiding the prior "two-channel" cost when two components
    // subscribe to the same event. The registry also handles CHANNEL_ERROR
    // reconnection (was previously silently logged and never retried).
    return subscribeToCommentChanges(eventId, () => {
      void queryClient.invalidateQueries({ queryKey: qk.comments.byEvent(eventId) })
    })
  }, [eventId, queryClient])

  return useQuery({
    queryKey: qk.comments.byEvent(eventId),
    queryFn: async (): Promise<CommentWithProfile[]> => {
      if (!eventId) {
        return []
      }

      const { data, error } = await supabase
        .from("comments")
        .select(
          "id, user_id, event_id, body, is_approved, is_flagged, created_at, updated_at, user_profiles(display_name, avatar_url)"
        )
        .eq("event_id", eventId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      return (data ?? []) as CommentWithProfile[]
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
    mutationFn: async ({ eventId, body }: AddCommentInput) => {
      if (!userId) {
        throw new Error("You must be signed in to comment.")
      }

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

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: (_comment, variables) => {
      void queryClient.invalidateQueries({ queryKey: qk.comments.byEvent(variables.eventId) })
    },
  })
}
