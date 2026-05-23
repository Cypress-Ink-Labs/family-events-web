import { useQuery } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import { eventRowSchema, parseRowsWithSentry } from "@/lib/schemas"
import { supabase } from "@/infrastructure/supabase/client"
import type { Event, EventWithDetails } from "@/shared/types"
import { enrichAdminEvents } from "./admin-events-shared"
import { normalizeAiTrace } from "@/features/admin/types"
import type { EventAiTrace } from "@/shared/types"

const ADMIN_EVENT_EDITOR_SELECT =
  "id, title, description, start_datetime, end_datetime, timezone, venue_name, address, city_id, latitude, longitude, age_min, age_max, price, is_free, source_url, source_name, source_id, images, status, ai_confidence, ai_tag_provider, ai_tag_model, ai_tag_status, recurrence_info, is_featured, is_outdoor, view_count, search_vector, created_at, updated_at, admin_locked_fields, admin_last_edited_at, admin_last_edited_by"

export function useAdminEventDetail(eventId: string | undefined) {
  return useQuery({
    queryKey: qk.admin.events.detail(eventId),
    enabled: Boolean(eventId),
    queryFn: async (): Promise<EventWithDetails | null> => {
      if (!eventId) return null

      const { data, error } = await supabase
        .from("events")
        .select(ADMIN_EVENT_EDITOR_SELECT)
        .eq("id", eventId)
        .maybeSingle()

      if (error) {
        throw error
      }
      if (!data) {
        return null
      }

      const rows = parseRowsWithSentry(eventRowSchema, [data], {
        area: "admin.events.detail",
      })
      const enriched = await enrichAdminEvents(rows as Event[])
      return enriched[0] ?? null
    },
  })
}

export function useAdminEventLatestTrace(eventId: string | undefined) {
  return useQuery({
    queryKey: qk.admin.eventAiTrace(eventId),
    enabled: Boolean(eventId),
    queryFn: async () => {
      if (!eventId) return null
      const { data, error } = await supabase
        .from("event_ai_traces")
        .select(
          "id, event_id, source_run_id, trigger_type, provider, model, status, input_title, input_description, available_tag_slugs, predicted_tags, predicted_fields, reasoning_summary, fallback_reason, processing_ms, created_at"
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        throw error
      }
      return normalizeAiTrace((data ?? null) as EventAiTrace | null)
    },
  })
}
