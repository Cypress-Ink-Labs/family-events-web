import { supabase } from "@/infrastructure/supabase/client"
import type { AdminStats } from "@/features/admin/types"

/**
 * Aggregates admin dashboard stats from the events + event_sources tables in
 * a single round-trip. Pure data-access — the UI hook (`useAdminStats`)
 * just hands the result to TanStack Query.
 */
export async function fetchAdminStats(): Promise<AdminStats> {
  const [{ data: events, error: eventsError }, { data: sources, error: sourcesError }] =
    await Promise.all([
      supabase.from("events").select("status, ai_confidence"),
      supabase.from("event_sources").select("is_active, last_status"),
    ])
  if (eventsError) throw eventsError
  if (sourcesError) throw sourcesError

  const eventRows = events ?? []
  const sourceRows = sources ?? []
  let totalConfidenceRows = 0
  let highConfidenceRows = 0
  let mediumConfidenceRows = 0
  for (const event of eventRows) {
    const value = event.ai_confidence
    if (typeof value !== "number") continue
    totalConfidenceRows += 1
    if (value >= 0.9) highConfidenceRows += 1
    else if (value >= 0.7) mediumConfidenceRows += 1
  }
  const confidenceDenominator = totalConfidenceRows || 1
  const high = Math.round((highConfidenceRows / confidenceDenominator) * 100)
  const medium = Math.round((mediumConfidenceRows / confidenceDenominator) * 100)

  return {
    totalEvents: eventRows.length,
    pendingReview: eventRows.filter((event) => event.status === "draft").length,
    published: eventRows.filter((event) => event.status === "published").length,
    activeSources: sourceRows.filter((source) => source.is_active).length,
    sourceErrors: sourceRows.filter((source) => source.is_active && source.last_status === "error")
      .length,
    aiBuckets: {
      high,
      medium,
      low: Math.max(0, 100 - high - medium),
    },
  }
}
