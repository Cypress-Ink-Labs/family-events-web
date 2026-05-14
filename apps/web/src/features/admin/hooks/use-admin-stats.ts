import { useQuery } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { supabase } from "@/lib/supabase"
import type { AdminStats } from "./admin-types"

export function useAdminStats() {
  return useQuery({
    queryKey: qk.admin.stats,
    queryFn: async (): Promise<AdminStats> => {
      const [{ data: events, error: eventsError }, { data: sources, error: sourcesError }] =
        await Promise.all([
          supabase.from("events").select("status, ai_confidence"),
          supabase.from("event_sources").select("is_active, last_status"),
        ])

      if (eventsError) {
        throw eventsError
      }
      if (sourcesError) {
        throw sourcesError
      }

      const eventRows = events ?? []
      const sourceRows = sources ?? []
      const confidenceValues = eventRows
        .map((event) => event.ai_confidence)
        .filter((value): value is number => typeof value === "number")
      const totalConfidenceRows = confidenceValues.length || 1
      const high = Math.round(
        (confidenceValues.filter((value) => value >= 0.9).length / totalConfidenceRows) * 100
      )
      const medium = Math.round(
        (confidenceValues.filter((value) => value >= 0.7 && value < 0.9).length /
          totalConfidenceRows) *
          100
      )

      return {
        totalEvents: eventRows.length,
        pendingReview: eventRows.filter((event) => event.status === "draft").length,
        published: eventRows.filter((event) => event.status === "published").length,
        activeSources: sourceRows.filter((source) => source.is_active).length,
        sourceErrors: sourceRows.filter(
          (source) => source.is_active && source.last_status === "error"
        ).length,
        aiBuckets: {
          high,
          medium,
          low: Math.max(0, 100 - high - medium),
        },
      }
    },
  })
}
