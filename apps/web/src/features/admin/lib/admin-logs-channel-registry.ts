import { supabase } from "@/lib/supabase/client"
import { createRealtimeChannelRegistry } from "@/lib/realtime/channel-registry"

type Listener = () => void

type AdminLogTable = "source_runs" | "source_scrape_queue" | "event_tag_queue"

const CHANNEL_NAMES: Record<AdminLogTable, string> = {
  source_runs: "admin-logs:source_runs",
  source_scrape_queue: "admin-logs:source-scrape-queue",
  event_tag_queue: "admin-logs:event-tag-queue",
}

const adminLogsRegistry = createRealtimeChannelRegistry<AdminLogTable>({
  logPrefix: "admin-logs-channel",
  subject: "table",
  createChannel: (table, onChange, onStatus) =>
    supabase
      .channel(CHANNEL_NAMES[table])
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        onChange
      )
      .subscribe(onStatus),
})

export function subscribeToAdminLogTableChanges(
  table: AdminLogTable,
  listener: Listener
): () => void {
  return adminLogsRegistry.subscribe(table, listener)
}

// Test helper to reset active channels between test cases.
export function __resetAdminLogChannelRegistry(): void {
  adminLogsRegistry.reset()
}
