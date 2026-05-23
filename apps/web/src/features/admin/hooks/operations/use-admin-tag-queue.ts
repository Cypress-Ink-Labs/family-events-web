import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import {
  deleteDeadTagQueueRow,
  fetchDeadTagQueueRows,
  fetchTagQueueSummary,
  retryTagQueue,
} from "@/features/admin/api/tag-queue"

export type {
  DeadTagQueueRow,
  TagQueueStatus,
  TagQueueSummaryRow,
} from "@/features/admin/api/tag-queue"

// Live observability for the tag-event durable queue. Refreshes on a 10s
// cadence — fast enough to feel live while the cron worker runs every minute,
// slow enough that 4-tab admins don't hammer the DB.
export function useAdminTagQueueSummary() {
  return useQuery({
    queryKey: qk.admin.tagQueueSummary,
    queryFn: fetchTagQueueSummary,
    refetchInterval: 10_000,
  })
}

// Admin retry: re-enqueue tag-event work for a specific event. Idempotent
// against the partial-unique index on (event_id) WHERE status IN ('pending','processing').
export function useAdminRetryTagQueue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (eventId: string) => retryTagQueue(eventId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.tagQueueSummary })
      void queryClient.invalidateQueries({ queryKey: qk.admin.deadTagQueueRows })
    },
  })
}

export function useDeleteDeadTagQueueRow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (queueId: number) => deleteDeadTagQueueRow(queueId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.deadTagQueueRows })
      void queryClient.invalidateQueries({ queryKey: qk.admin.tagQueueSummary })
    },
  })
}

export function useAdminDeadTagQueueRows() {
  return useQuery({
    queryKey: qk.admin.deadTagQueueRows,
    queryFn: fetchDeadTagQueueRows,
    refetchInterval: 30_000,
  })
}
