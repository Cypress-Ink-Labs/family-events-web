import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import {
  deleteDeadSourceQueueRow,
  fetchDeadSourceQueueRows,
  fetchSourceQueueSummary,
  retrySourceQueue,
} from "@/features/admin/api/source-queue"

export type {
  DeadSourceQueueRow,
  SourceQueueStatus,
  SourceQueueSummaryRow,
} from "@/features/admin/api/source-queue"

export function useAdminSourceQueueSummary() {
  return useQuery({
    queryKey: qk.admin.sourceQueueSummary,
    queryFn: fetchSourceQueueSummary,
    refetchInterval: 10_000,
  })
}

export function useAdminDeadSourceQueueRows() {
  return useQuery({
    queryKey: qk.admin.deadSourceQueueRows,
    queryFn: fetchDeadSourceQueueRows,
    refetchInterval: 30_000,
  })
}

export function useAdminRetrySourceQueue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (queueId: number) => retrySourceQueue(queueId),
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
    mutationFn: (queueId: number) => deleteDeadSourceQueueRow(queueId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.deadSourceQueueRows })
      void queryClient.invalidateQueries({ queryKey: qk.admin.sourceQueueSummary })
    },
  })
}
