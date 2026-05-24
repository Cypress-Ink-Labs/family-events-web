import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import { ADMIN_LOGS_POLL_INTERVAL_MS } from "@/shared/constants/time"

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

    const id = setInterval(invalidateAdminLogQueries, ADMIN_LOGS_POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [queryClient])
}
