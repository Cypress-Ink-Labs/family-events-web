import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { subscribeToAdminLogTableChanges } from "@/features/admin/lib/admin-logs-channel-registry"

export function useAdminLogsRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const invalidateAdminLogQueries = () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.sourceRuns })
      void queryClient.invalidateQueries({ queryKey: qk.admin.sourceQueueSummary })
      void queryClient.invalidateQueries({ queryKey: qk.admin.deadSourceQueueRows })
      void queryClient.invalidateQueries({ queryKey: qk.admin.tagQueueSummary })
      void queryClient.invalidateQueries({ queryKey: qk.admin.deadTagQueueRows })
    }

    const unsubSourceRuns = subscribeToAdminLogTableChanges(
      "source_runs",
      invalidateAdminLogQueries
    )
    const unsubSourceQueue = subscribeToAdminLogTableChanges(
      "source_scrape_queue",
      invalidateAdminLogQueries
    )
    const unsubTagQueue = subscribeToAdminLogTableChanges(
      "event_tag_queue",
      invalidateAdminLogQueries
    )

    return () => {
      unsubSourceRuns()
      unsubSourceQueue()
      unsubTagQueue()
    }
  }, [queryClient])
}
