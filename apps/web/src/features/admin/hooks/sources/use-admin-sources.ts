import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import {
  bulkSetProcessingMode,
  createAdminSource,
  listAdminSources,
  markSourceScrapeFailed,
  triggerSourceScrape,
  updateAdminSource,
} from "@/features/admin/api/sources"
import type { EventSource } from "@/shared/types"

export function useAdminSources() {
  return useQuery({
    queryKey: qk.admin.sources,
    queryFn: listAdminSources,
  })
}

export function useCreateAdminSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Omit<EventSource, "id" | "created_at" | "updated_at">) =>
      createAdminSource(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.sources })
    },
  })
}

export function useUpdateAdminSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      sourceId,
      updates,
    }: {
      sourceId: string
      updates: Partial<Omit<EventSource, "id" | "created_at">>
    }) => updateAdminSource(sourceId, updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.sources })
    },
  })
}

export function useTriggerSourceScrape() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sourceId }: { sourceId: string }) => triggerSourceScrape(sourceId),
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
        await markSourceScrapeFailed(variables.sourceId)
      } catch (error) {
        console.error("Failed to mark source last_status=error after scrape failure", error)
      } finally {
        void queryClient.invalidateQueries({ queryKey: qk.admin.sources })
      }
    },
  })
}


export function useAdminBulkSetProcessingMode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (mode: EventSource["processing_mode"]) => bulkSetProcessingMode(mode),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.sources })
    },
  })
}
