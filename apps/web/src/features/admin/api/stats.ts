import { supabase } from "@/infrastructure/supabase/client"
import type { AdminStats } from "@/features/admin/types"

/**
 * Aggregates admin dashboard stats from the events + event_sources tables in
 * a single round-trip. Pure data-access — the UI hook (`useAdminStats`)
 * just hands the result to TanStack Query.
 */
export async function fetchAdminStats(): Promise<AdminStats> {
  const [
    { count: totalCount, error: totalError },
    { count: draftCount, error: draftError },
    { count: publishedCount, error: publishedError },
    { data: confidenceData, error: confidenceError },
    { data: sources, error: sourcesError },
  ] = await Promise.all([
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("events").select("ai_confidence").not("ai_confidence", "is", null),
    supabase.from("event_sources").select("is_active, last_status"),
  ])
  if (totalError) throw totalError
  if (draftError) throw draftError
  if (publishedError) throw publishedError
  if (confidenceError) throw confidenceError
  if (sourcesError) throw sourcesError

  const sourceRows = sources ?? []
  let totalConfidenceRows = 0
  let highConfidenceRows = 0
  let mediumConfidenceRows = 0
  for (const event of confidenceData ?? []) {
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
    totalEvents: totalCount ?? 0,
    pendingReview: draftCount ?? 0,
    published: publishedCount ?? 0,
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
