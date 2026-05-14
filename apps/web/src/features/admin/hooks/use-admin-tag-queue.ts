import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { supabase } from "@/lib/supabase"

export type TagQueueStatus = "pending" | "processing" | "failed" | "dead"

export interface TagQueueSummaryRow {
  status: TagQueueStatus
  row_count: number
  oldest_enqueued_at: string | null
  newest_enqueued_at: string | null
  last_dead_letter_at: string | null
  avg_attempts: number | null
}

// Live observability for the tag-event durable queue. Refreshes on a 10s
// cadence — fast enough to feel live while the cron worker runs every minute,
// slow enough that 4-tab admins don't hammer the DB.
export function useAdminTagQueueSummary() {
  return useQuery({
    queryKey: qk.admin.tagQueueSummary,
    queryFn: async (): Promise<TagQueueSummaryRow[]> => {
      const { data, error } = await supabase
        .from("event_tag_queue_summary")
        .select(
          "status, row_count, oldest_enqueued_at, newest_enqueued_at, last_dead_letter_at, avg_attempts"
        )
      if (error) throw error
      return (data ?? []) as TagQueueSummaryRow[]
    },
    refetchInterval: 10_000,
  })
}

// Admin retry: re-enqueue tag-event work for a specific event. Idempotent
// against the partial-unique index on (event_id) WHERE status IN ('pending','processing').
export function useAdminRetryTagQueue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (eventId: string): Promise<boolean> => {
      const { data, error } = await supabase.rpc("admin_retry_tag_queue", {
        p_event_id: eventId,
      })
      if (error) throw error
      return Boolean(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.tagQueueSummary })
    },
  })
}
