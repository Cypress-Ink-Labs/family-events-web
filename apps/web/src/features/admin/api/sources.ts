import { validateExternalUrl } from "@family-events/shared"
import { eventSourceRowSchema, parseRowsWithSentry } from "@/lib/schemas"
import type { Json } from "@/lib/db"
import { supabase } from "@/lib/supabase/client"
import type { EventSource } from "@/lib/types"

const EVENT_SOURCE_COLUMNS =
  "id, name, url, source_type, extraction_mode, processing_mode, city_id, is_active, auto_approve, scrape_interval_hours, last_scraped_at, last_status, error_count, notes, created_at, updated_at"

export async function listAdminSources(): Promise<EventSource[]> {
  const { data, error } = await supabase
    .from("event_sources")
    .select(EVENT_SOURCE_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id")
  if (error) throw error
  return parseRowsWithSentry(eventSourceRowSchema, data, {
    area: "admin.sources.list",
  }) as EventSource[]
}

/** Throws on invalid URL; the wire validation also runs here so RPC errors stay surgical. */
function ensureExternalUrlAllowed(url: string | undefined, sourceType?: string): void {
  if (url === undefined) return
  if (sourceType === "manual") return
  const validation = validateExternalUrl(url)
  if (!validation.ok) {
    throw new Error(validation.reason ?? "Invalid source URL")
  }
}

export async function createAdminSource(
  payload: Omit<EventSource, "id" | "created_at" | "updated_at">
): Promise<void> {
  ensureExternalUrlAllowed(payload.url, payload.source_type)
  const { error } = await supabase.rpc("admin_create_source", {
    p_source: payload as unknown as Json,
  })
  if (error) throw error
}

export async function updateAdminSource(
  sourceId: string,
  updates: Partial<Omit<EventSource, "id" | "created_at">>
): Promise<void> {
  ensureExternalUrlAllowed(updates.url, updates.source_type)
  const { error } = await supabase.rpc("admin_update_source", {
    p_source_id: sourceId,
    p_patch: updates as unknown as Json,
  })
  if (error) throw error
}

export async function triggerSourceScrape(sourceId: string): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke("scrape-source", {
    body: { source_id: sourceId },
  })
  if (error) throw error
  return data
}

/**
 * Writes `last_status: "error"` from the client when the scrape edge function
 * failed before it could update its own status (e.g. BOOT_ERROR).
 */
export async function markSourceScrapeFailed(sourceId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_update_source", {
    p_source_id: sourceId,
    p_patch: { last_status: "error" },
  })
  if (error) throw error
}

export async function bulkSetProcessingMode(mode: EventSource["processing_mode"]): Promise<void> {
  const { error } = await supabase.rpc("admin_bulk_set_processing_mode", { p_mode: mode })
  if (error) throw error
}
