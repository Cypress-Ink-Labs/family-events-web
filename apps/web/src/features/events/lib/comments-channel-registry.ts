import type { RealtimeChannel } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

// Module-level registry of one Supabase realtime channel per event id.
// Multiple useComments(eventId) mounts on the same event share one channel
// instead of each opening its own (two open panels of comments → two
// channels → two invalidations per insert, was the prior behaviour).
//
// Reconnection backoff: on CHANNEL_ERROR / TIMED_OUT, schedule a retry that
// doubles up to RECONNECT_MAX_MS. Cleared on the next SUBSCRIBED event.

type Listener = () => void

interface ChannelEntry {
  channel: RealtimeChannel
  listeners: Set<Listener>
  retryAttempt: number
  retryTimer: ReturnType<typeof setTimeout> | null
}

const RECONNECT_BASE_MS = 1_000
const RECONNECT_MAX_MS = 30_000

const registry = new Map<string, ChannelEntry>()

function dispatch(eventId: string) {
  const entry = registry.get(eventId)
  if (!entry) return
  for (const listener of entry.listeners) {
    try {
      listener()
    } catch (err) {
      console.error("[comments-channel] listener threw for event", eventId, err)
    }
  }
}

function clearRetry(entry: ChannelEntry) {
  if (entry.retryTimer) {
    clearTimeout(entry.retryTimer)
    entry.retryTimer = null
  }
}

function scheduleReconnect(eventId: string) {
  const entry = registry.get(eventId)
  if (!entry) return
  clearRetry(entry)
  const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, entry.retryAttempt), RECONNECT_MAX_MS)
  entry.retryAttempt += 1
  entry.retryTimer = setTimeout(() => {
    const current = registry.get(eventId)
    if (!current || current.listeners.size === 0) return
    void supabase.removeChannel(current.channel).catch(() => {})
    current.channel = createChannel(eventId)
  }, delay)
}

function createChannel(eventId: string): RealtimeChannel {
  return supabase
    .channel(`comments:${eventId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "comments",
        filter: `event_id=eq.${eventId}`,
      },
      () => dispatch(eventId)
    )
    .subscribe((status) => {
      const entry = registry.get(eventId)
      if (!entry) return
      if (status === "SUBSCRIBED") {
        entry.retryAttempt = 0
        clearRetry(entry)
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(
          `[comments-channel] subscription status "${status}" for event ${eventId}; reconnecting`
        )
        scheduleReconnect(eventId)
      }
    })
}

/**
 * Subscribe to comment changes for a single event. Returns an unsubscribe
 * function. Channel is created lazily on first subscriber and torn down
 * after the last subscriber unsubscribes.
 */
export function subscribeToCommentChanges(eventId: string, listener: Listener): () => void {
  let entry = registry.get(eventId)
  if (!entry) {
    entry = {
      channel: null as unknown as RealtimeChannel,
      listeners: new Set(),
      retryAttempt: 0,
      retryTimer: null,
    }
    registry.set(eventId, entry)
    entry.channel = createChannel(eventId)
  }
  entry.listeners.add(listener)

  return () => {
    const current = registry.get(eventId)
    if (!current) return
    current.listeners.delete(listener)
    if (current.listeners.size === 0) {
      clearRetry(current)
      void supabase.removeChannel(current.channel).catch(() => {})
      registry.delete(eventId)
    }
  }
}

// Test-only: lets unit tests reset the registry between cases.
export function __resetCommentsChannelRegistry(): void {
  for (const entry of registry.values()) {
    clearRetry(entry)
    void supabase.removeChannel(entry.channel).catch(() => {})
  }
  registry.clear()
}
