import { useQuery } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import { fetchAdminStats } from "@/features/admin/api/stats"

export function useAdminStats() {
  return useQuery({
    queryKey: qk.admin.stats,
    queryFn: fetchAdminStats,
  })
}
