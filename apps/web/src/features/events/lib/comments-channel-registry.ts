import { supabase } from "@/lib/supabase"
import { createRealtimeChannelRegistry } from "@/lib/realtime/channel-registry"

type Listener = () => void

const commentsRegistry = createRealtimeChannelRegistry<string>({
  logPrefix: "comments-channel",
  subject: "event",
  createChannel: (eventId, onChange, onStatus) =>
    supabase
      .channel(`comments:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `event_id=eq.${eventId}`,
        },
        onChange
      )
      .subscribe(onStatus),
})

/**
 * Subscribe to comment changes for a single event. Returns an unsubscribe
 * function. Channel is created lazily on first subscriber and torn down
 * after the last subscriber unsubscribes.
 */
export function subscribeToCommentChanges(eventId: string, listener: Listener): () => void {
  return commentsRegistry.subscribe(eventId, listener)
}

// Test-only: lets unit tests reset the registry between cases.
export function __resetCommentsChannelRegistry(): void {
  commentsRegistry.reset()
}
