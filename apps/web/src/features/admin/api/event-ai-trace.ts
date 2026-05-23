import { supabase } from "@/lib/supabase/client"
import { normalizeAiTrace } from "@/features/admin/types"
import type { EventAiTrace, EventAiTraceWithParsed, Json } from "@/lib/types"

const EVENT_AI_TRACE_COLUMNS =
  "id, event_id, source_run_id, trigger_type, provider, model, status, input_title, input_description, available_tag_slugs, predicted_tags, predicted_fields, reasoning_summary, fallback_reason, processing_ms, created_at"

export async function fetchEventAiTrace(eventId: string): Promise<EventAiTraceWithParsed | null> {
  const { data, error } = await supabase
    .from("event_ai_traces")
    .select(EVENT_AI_TRACE_COLUMNS)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return normalizeAiTrace((data ?? null) as EventAiTrace | null)
}

/** Updates the admin tag overrides for an event via the wrapped RPC. */
export async function updateAdminEventTags(eventId: string, tagIds: string[]): Promise<string> {
  const dedupedTagIds = [...new Set(tagIds)]
  const { error } = await supabase.rpc("admin_update_event", {
    p_event_id: eventId,
    p_patch: {} as Json,
    p_tag_ids: dedupedTagIds,
    p_lock_edited_fields: false,
  })
  if (error) throw error
  return eventId
}
