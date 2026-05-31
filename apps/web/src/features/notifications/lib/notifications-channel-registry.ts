import { supabase } from "@/infrastructure/supabase/client"
import { createRealtimeChannelRegistry } from "@/infrastructure/realtime/channel-registry"

type Listener = () => void

const notificationsRegistry = createRealtimeChannelRegistry<string>({
  logPrefix: "notifications-channel",
  subject: "user",
  createChannel: (userId, onChange, onStatus) => {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${userId}`,
        },
        onChange
      )
      .subscribe(onStatus)
  },
})

/**
 * Subscribe to notification changes for a user. Returns an unsubscribe function.
 * Channel is created lazily on first subscriber and torn down after last unsubscribes.
 */
export function subscribeToNotificationChanges(userId: string, listener: Listener): () => void {
  return notificationsRegistry.subscribe(userId, listener)
}

// Test-only: reset for unit tests.
export function __resetNotificationsChannelRegistry(): void {
  notificationsRegistry.reset()
}
