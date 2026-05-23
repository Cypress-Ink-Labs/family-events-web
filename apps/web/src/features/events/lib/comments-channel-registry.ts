import { supabase } from "@/infrastructure/supabase/client"
import { createRealtimeChannelRegistry } from "@/infrastructure/realtime/channel-registry"

type Listener = () => void

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function assertCanonicalUuid(eventId: string): string {
  if (!UUID_PATTERN.test(eventId)) {
    throw new Error("Comment subscription eventId must be a UUID.")
  }
  return eventId
}

const commentsRegistry = createRealtimeChannelRegistry<string>({
  logPrefix: "comments-channel",
  subject: "event",
  createChannel: (eventId, onChange, onStatus) => {
    const validatedEventId = assertCanonicalUuid(eventId)
    return supabase
      .channel(`comments:${validatedEventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `event_id=eq.${validatedEventId}`,
        },
        onChange
      )
      .subscribe(onStatus)
  },
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
