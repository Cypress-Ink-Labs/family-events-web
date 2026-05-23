import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { supabase } from "@/lib/supabase/client"
import type { SourceQueueStatus as DbSourceQueueStatus } from "@/lib/types"

export type SourceQueueStatus = DbSourceQueueStatus

export interface SourceQueueSummaryRow {
  status: SourceQueueStatus
  row_count: number
  oldest_enqueued_at: string | null
  oldest_processing_started_at: string | null
  newest_finished_at: string | null
  last_dead_letter_at: string | null
  avg_attempts: number | null
}

export interface DeadSourceQueueRow {
  id: number
  source_id: string | null
  source_run_id: string | null
  trigger_type: string
  attempt_count: number
  enqueued_at: string
  finished_at: string | null
  last_error: string | null
  event_sources: { name: string | null } | null
}

export function useAdminSourceQueueSummary() {
  return useQuery({
    queryKey: qk.admin.sourceQueueSummary,
    queryFn: async (): Promise<SourceQueueSummaryRow[]> => {
      const { data, error } = await supabase
        .from("source_scrape_queue_summary")
        .select(
          "status, row_count, oldest_enqueued_at, oldest_processing_started_at, newest_finished_at, last_dead_letter_at, avg_attempts"
        )
      if (error) throw error
      return (data ?? []) as SourceQueueSummaryRow[]
    },
    refetchInterval: 10_000,
  })
}

export function useAdminDeadSourceQueueRows() {
  return useQuery({
    queryKey: qk.admin.deadSourceQueueRows,
    queryFn: async (): Promise<DeadSourceQueueRow[]> => {
      const { data, error } = await supabase
        .from("source_scrape_queue")
        .select(
          "id, source_id, source_run_id, trigger_type, attempt_count, enqueued_at, finished_at, last_error, event_sources(name)"
        )
        .eq("status", "dead")
        .order("finished_at", { ascending: false })
        .limit(20)
      if (error) throw error
      return (data ?? []) as DeadSourceQueueRow[]
    },
    refetchInterval: 30_000,
  })
}

export function useAdminRetrySourceQueue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (queueId: number): Promise<boolean> => {
      const { data, error } = await supabase.rpc("admin_retry_source_scrape_queue", {
        p_queue_id: queueId,
      })
      if (error) throw error
      return Boolean(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.sourceQueueSummary })
      void queryClient.invalidateQueries({ queryKey: qk.admin.deadSourceQueueRows })
      void queryClient.invalidateQueries({ queryKey: qk.admin.sources })
    },
  })
}

export function useDeleteDeadSourceQueueRow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (queueId: number): Promise<boolean> => {
      const { data, error } = await supabase.rpc("admin_delete_dead_source_queue", {
        p_queue_id: queueId,
      })
      if (error) throw error
      return Boolean(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.deadSourceQueueRows })
      void queryClient.invalidateQueries({ queryKey: qk.admin.sourceQueueSummary })
    },
  })
}
