import type { RealtimeChannel } from "@supabase/supabase-js"
import { supabase } from "@/infrastructure/supabase/client"

type Listener = () => void
type StatusCallback = (status: string) => void

interface ChannelEntry {
  channel: RealtimeChannel | null
  listeners: Set<Listener>
  retryAttempt: number
  retryTimer: ReturnType<typeof setTimeout> | null
}

interface RealtimeChannelRegistryOptions<Key extends string> {
  logPrefix: string
  subject: string
  reconnectBaseMs?: number
  reconnectMaxMs?: number
  createChannel: (key: Key, onChange: Listener, onStatus: StatusCallback) => RealtimeChannel
}

const DEFAULT_RECONNECT_BASE_MS = 1_000
const DEFAULT_RECONNECT_MAX_MS = 30_000

export function createRealtimeChannelRegistry<Key extends string>({
  logPrefix,
  subject,
  reconnectBaseMs = DEFAULT_RECONNECT_BASE_MS,
  reconnectMaxMs = DEFAULT_RECONNECT_MAX_MS,
  createChannel,
}: RealtimeChannelRegistryOptions<Key>) {
  const registry = new Map<Key, ChannelEntry>()

  function dispatch(key: Key) {
    const entry = registry.get(key)
    if (!entry) return
    for (const listener of entry.listeners) {
      try {
        listener()
      } catch (err) {
        console.error(`[${logPrefix}] listener threw for ${subject}`, key, err)
      }
    }
  }

  function clearRetry(entry: ChannelEntry) {
    if (entry.retryTimer) {
      clearTimeout(entry.retryTimer)
      entry.retryTimer = null
    }
  }

  function attachChannel(key: Key, entry: ChannelEntry) {
    entry.channel = createChannel(
      key,
      () => dispatch(key),
      (status) => {
        const current = registry.get(key)
        if (!current) return
        if (status === "SUBSCRIBED") {
          current.retryAttempt = 0
          clearRetry(current)
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(
            `[${logPrefix}] subscription status "${status}" for ${subject} ${key}; reconnecting`
          )
          scheduleReconnect(key)
        }
      }
    )
  }

  function scheduleReconnect(key: Key) {
    const entry = registry.get(key)
    if (!entry) return
    clearRetry(entry)
    const delay = Math.min(reconnectBaseMs * Math.pow(2, entry.retryAttempt), reconnectMaxMs)
    entry.retryAttempt += 1
    entry.retryTimer = setTimeout(() => {
      const current = registry.get(key)
      if (!current || current.listeners.size === 0) return
      if (current.channel) {
        void supabase.removeChannel(current.channel).catch(() => {})
      }
      attachChannel(key, current)
    }, delay)
  }

  function subscribe(key: Key, listener: Listener): () => void {
    let entry = registry.get(key)
    if (!entry) {
      entry = {
        channel: null,
        listeners: new Set(),
        retryAttempt: 0,
        retryTimer: null,
      }
      registry.set(key, entry)
      attachChannel(key, entry)
    }

    entry.listeners.add(listener)

    return () => {
      const current = registry.get(key)
      if (!current) return
      current.listeners.delete(listener)
      if (current.listeners.size === 0) {
        clearRetry(current)
        if (current.channel) {
          void supabase.removeChannel(current.channel).catch(() => {})
        }
        registry.delete(key)
      }
    }
  }

  function reset() {
    for (const entry of registry.values()) {
      clearRetry(entry)
      if (entry.channel) {
        void supabase.removeChannel(entry.channel).catch(() => {})
      }
    }
    registry.clear()
  }

  return { subscribe, reset }
}
