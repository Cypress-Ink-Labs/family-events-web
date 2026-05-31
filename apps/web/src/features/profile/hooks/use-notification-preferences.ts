import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import { supabase } from "@/infrastructure/supabase/client"
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  toUpsertParams,
  type NotificationPreferences,
} from "@family-events/contracts"

/**
 * Fetch the current user's notification preferences.
 * Returns defaults if no row exists yet (first visit before any save).
 */
export function useNotificationPreferences(userId: string | undefined) {
  return useQuery({
    queryKey: qk.notificationPreferences.byUser(userId),
    queryFn: async (): Promise<NotificationPreferences> => {
      if (!userId) {
        return { ...DEFAULT_NOTIFICATION_PREFERENCES }
      }

      const { data, error } = await supabase
        .from("user_notification_preferences")
        .select(
          "reminder_email, reminder_push, change_email, change_push, digest_email, digest_push"
        )
        .eq("user_id", userId)
        .maybeSingle()

      if (error) {
        throw error
      }

      // No row yet — return defaults
      if (!data) {
        return { ...DEFAULT_NOTIFICATION_PREFERENCES }
      }

      return {
        reminder_email: data.reminder_email,
        reminder_push: data.reminder_push,
        change_email: data.change_email,
        change_push: data.change_push,
        digest_email: data.digest_email,
        digest_push: data.digest_push,
      }
    },
    enabled: !!userId,
  })
}

/**
 * Upsert notification preferences via RPC with optimistic update.
 */
export function useUpdateNotificationPreferences(userId: string | undefined) {
  const queryClient = useQueryClient()
  const queryKey = qk.notificationPreferences.byUser(userId)

  return useMutation({
    mutationFn: async (prefs: NotificationPreferences) => {
      if (!userId) {
        throw new Error("You must be signed in to update notification preferences.")
      }

      const { data, error } = await supabase.rpc(
        "upsert_notification_preferences",
        toUpsertParams(prefs)
      )

      if (error) {
        throw error
      }

      return data
    },
    onMutate: async (newPrefs) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey })

      // Snapshot previous value
      const previous = queryClient.getQueryData<NotificationPreferences>(queryKey)

      // Optimistically update
      queryClient.setQueryData<NotificationPreferences>(queryKey, newPrefs)

      return { previous }
    },
    onError: (_error, _newPrefs, context) => {
      // Roll back optimistic update
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      void queryClient.invalidateQueries({ queryKey })
    },
  })
}
