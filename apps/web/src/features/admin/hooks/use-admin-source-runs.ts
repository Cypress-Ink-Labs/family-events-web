import { useQuery } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { supabase } from "@/lib/supabase"
import type { AdminSourceRun } from "./admin-types"

const SOURCE_RUN_ERRORS_MAX_LIMIT = 500

export function useAdminSourceRuns() {
  return useQuery({
    queryKey: qk.admin.sourceRuns,
    queryFn: async (): Promise<AdminSourceRun[]> => {
      const { data, error } = await supabase
        .from("source_runs")
        .select(
          "id, source_id, started_at, completed_at, status, events_found, events_imported, events_skipped, error_log, created_at, event_sources(name)"
        )
        .order("started_at", { ascending: false })
        .limit(50)

      if (error) {
        throw error
      }
      return (data ?? []) as AdminSourceRun[]
    },
    refetchInterval: (query) =>
      query.state.data?.some((run) => run.status === "running") ? 3000 : false,
  })
}

export function useAdminSourceRunErrors(sourceIds: readonly string[]) {
  return useQuery({
    queryKey: qk.admin.sourceRunErrors(sourceIds),
    enabled: sourceIds.length > 0,
    queryFn: async (): Promise<AdminSourceRun[]> => {
      const { data, error } = await supabase
        .from("source_runs")
        .select(
          "id, source_id, started_at, completed_at, status, events_found, events_imported, events_skipped, error_log, created_at, event_sources(name)"
        )
        .in("source_id", [...sourceIds])
        .eq("status", "error")
        .not("error_log", "is", null)
        .order("started_at", { ascending: false })
        .limit(Math.min(Math.max(sourceIds.length * 5, 100), SOURCE_RUN_ERRORS_MAX_LIMIT))

      if (error) {
        throw error
      }

      return (data ?? []) as AdminSourceRun[]
    },
  })
}
