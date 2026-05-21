import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { eventSourceRowSchema, parseRowsWithSentry } from "@/lib/schemas"
import { supabase } from "@/lib/supabase"
import { validateExternalUrl } from "@family-events/shared"
import type { EventSource } from "@/lib/types"

export function useAdminSources() {
  return useQuery({
    queryKey: qk.admin.sources,
    queryFn: async (): Promise<EventSource[]> => {
      const { data, error } = await supabase
        .from("event_sources")
        .select(
          "id, name, url, source_type, extraction_mode, city_id, is_active, auto_approve, scrape_interval_hours, last_scraped_at, last_status, error_count, notes, created_at, updated_at"
        )
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }
      return parseRowsWithSentry(eventSourceRowSchema, data, {
        area: "admin.sources.list",
      }) as EventSource[]
    },
  })
}

export function useCreateAdminSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Omit<EventSource, "id" | "created_at" | "updated_at">) => {
      if (payload.source_type !== "manual") {
        const validation = validateExternalUrl(payload.url)
        if (!validation.ok) {
          throw new Error(validation.reason ?? "Invalid source URL")
        }
      }
      const { error } = await supabase.from("event_sources").insert(payload)
      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.sources })
    },
  })
}

export function useUpdateAdminSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      sourceId,
      updates,
    }: {
      sourceId: string
      updates: Partial<Omit<EventSource, "id" | "created_at">>
    }) => {
      if (updates.url !== undefined && updates.source_type !== "manual") {
        const validation = validateExternalUrl(updates.url)
        if (!validation.ok) {
          throw new Error(validation.reason ?? "Invalid source URL")
        }
      }
      const { error } = await supabase.from("event_sources").update(updates).eq("id", sourceId)
      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.sources })
    },
  })
}

export function useTriggerSourceScrape() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sourceId }: { sourceId: string }) => {
      const { data, error } = await supabase.functions.invoke("scrape-source", {
        body: { source_id: sourceId },
      })

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.sources })
      void queryClient.invalidateQueries({ queryKey: qk.admin.sourceQueueSummary })
      void queryClient.invalidateQueries({ queryKey: qk.admin.sourceRuns })
      void queryClient.invalidateQueries({ queryKey: qk.admin.stats })
    },
    onError: async (_error, variables) => {
      // The edge function failed before it could update last_status (e.g. BOOT_ERROR).
      // Write 'error' from the client so the card shows Failed instead of staying Pending.
      try {
        const { error } = await supabase
          .from("event_sources")
          .update({ last_status: "error" })
          .eq("id", variables.sourceId)
        if (error) {
          console.error("Failed to mark source last_status=error after scrape failure", error)
        }
      } finally {
        void queryClient.invalidateQueries({ queryKey: qk.admin.sources })
      }
    },
  })
}

export function useAdminBulkSetAutoApprove() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (enable: boolean) => {
      const { error } = await supabase.rpc("admin_bulk_set_auto_approve", { enable })
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.sources })
    },
  })
}
