import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { supabase } from "@/lib/supabase/client"
import { normalizeAiTrace } from "@/features/admin/types"
import type { EventAiTrace, Json } from "@/lib/types"

export function useAdminEventAiTrace(eventId: string | null) {
  return useQuery({
    queryKey: qk.admin.eventAiTrace(eventId),
    enabled: Boolean(eventId),
    queryFn: async () => {
      if (!eventId) {
        return null
      }

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

export function useUpdateAdminEventTags() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, tagIds }: { eventId: string; tagIds: string[] }) => {
      const dedupedTagIds = [...new Set(tagIds)]

      const { error } = await supabase.rpc("admin_update_event", {
        p_event_id: eventId,
        p_patch: {} as Json,
        p_tag_ids: dedupedTagIds,
        p_lock_edited_fields: false,
      })
      if (error) {
        throw error
      }

      return eventId
    },
    onSuccess: (eventId) => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.events.all })
      void queryClient.invalidateQueries({ queryKey: qk.admin.eventAiTrace(eventId) })
      void queryClient.invalidateQueries({ queryKey: qk.events.all })
      void queryClient.invalidateQueries({ queryKey: qk.events.detailAll })
      void queryClient.invalidateQueries({ queryKey: qk.enrichedEvents.all })
      void queryClient.invalidateQueries({ queryKey: qk.admin.events.detail(eventId) })
      void queryClient.invalidateQueries({ queryKey: qk.events.detailById(eventId) })
    },
  })
}
