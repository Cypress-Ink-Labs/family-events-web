import type { RealtimeChannel } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

type Listener = () => void

type AdminLogTable = "source_runs" | "source_scrape_queue" | "event_tag_queue"

interface ChannelEntry {
  channel: RealtimeChannel
  listeners: Set<Listener>
  retryAttempt: number
  retryTimer: ReturnType<typeof setTimeout> | null
}

const RECONNECT_BASE_MS = 1_000
const RECONNECT_MAX_MS = 30_000

const CHANNEL_NAMES: Record<AdminLogTable, string> = {
  source_runs: "admin-logs:source_runs",
  source_scrape_queue: "admin-logs:source-scrape-queue",
  event_tag_queue: "admin-logs:event-tag-queue",
}

const registry = new Map<AdminLogTable, ChannelEntry>()

function dispatch(table: AdminLogTable) {
  const entry = registry.get(table)
  if (!entry) return
  for (const listener of entry.listeners) {
    try {
      listener()
    } catch (err) {
      console.error("[admin-logs-channel] listener threw for table", table, err)
    }
  }
}

function clearRetry(entry: ChannelEntry) {
  if (entry.retryTimer) {
    clearTimeout(entry.retryTimer)
    entry.retryTimer = null
  }
}

function scheduleReconnect(table: AdminLogTable) {
  const entry = registry.get(table)
  if (!entry) return
  clearRetry(entry)
  const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, entry.retryAttempt), RECONNECT_MAX_MS)
  entry.retryAttempt += 1
  entry.retryTimer = setTimeout(() => {
    const current = registry.get(table)
    if (!current || current.listeners.size === 0) return
    void supabase.removeChannel(current.channel).catch(() => {})
    current.channel = createChannel(table)
  }, delay)
}

function createChannel(table: AdminLogTable): RealtimeChannel {
  return supabase
    .channel(CHANNEL_NAMES[table])
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
      },
      () => dispatch(table)
    )
    .subscribe((status) => {
      const entry = registry.get(table)
      if (!entry) return
      if (status === "SUBSCRIBED") {
        entry.retryAttempt = 0
        clearRetry(entry)
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(
          `[admin-logs-channel] subscription status "${status}" for table ${table}; reconnecting`
        )
        scheduleReconnect(table)
      }
    })
}

export function subscribeToAdminLogTableChanges(
  table: AdminLogTable,
  listener: Listener
): () => void {
  let entry = registry.get(table)
  if (!entry) {
    entry = {
      channel: null as unknown as RealtimeChannel,
      listeners: new Set(),
      retryAttempt: 0,
      retryTimer: null,
    }
    registry.set(table, entry)
    entry.channel = createChannel(table)
  }

  entry.listeners.add(listener)

  return () => {
    const current = registry.get(table)
    if (!current) return
    current.listeners.delete(listener)
    if (current.listeners.size === 0) {
      clearRetry(current)
      void supabase.removeChannel(current.channel).catch(() => {})
      registry.delete(table)
    }
  }
}

// Test helper to reset active channels between test cases.
export function __resetAdminLogChannelRegistry(): void {
  for (const entry of registry.values()) {
    clearRetry(entry)
    void supabase.removeChannel(entry.channel).catch(() => {})
  }
  registry.clear()
}
