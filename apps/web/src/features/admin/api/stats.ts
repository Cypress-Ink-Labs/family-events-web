import { supabase } from "@/infrastructure/supabase/client"
import type { AdminStats } from "@/features/admin/types"

interface AdminDashboardStatsPayload {
  total_events: number
  draft_events: number
  published_events: number
  ai_confidence: { high: number; medium: number; low: number }
  sources: { active: number; errors: number }
  dead_letters: {
    tag_queue: number
    source_queue: number
    oldest_tag_dead_at: string | null
    oldest_source_dead_at: string | null
  }
  generated_at: string
}

/**
 * Aggregates admin dashboard stats via the admin_dashboard_stats RPC — one
 * round-trip replacing the previous five parallel queries. Pure data-access —
 * the UI hook (`useAdminStats`) just hands the result to TanStack Query.
 */
export async function fetchAdminStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc("admin_dashboard_stats")
  if (error) throw error
  // RPC returns Json; shape is defined by the SQL function.
  const stats = data as unknown as AdminDashboardStatsPayload

  // aiBuckets are percentages of events that have a confidence score.
  const { high: highCount, medium: mediumCount, low: lowCount } = stats.ai_confidence
  const confidenceDenominator = highCount + mediumCount + lowCount || 1
  const high = Math.round((highCount / confidenceDenominator) * 100)
  const medium = Math.round((mediumCount / confidenceDenominator) * 100)

  return {
    totalEvents: stats.total_events,
    pendingReview: stats.draft_events,
    published: stats.published_events,
    activeSources: stats.sources.active,
    sourceErrors: stats.sources.errors,
    aiBuckets: {
      high,
      medium,
      low: Math.max(0, 100 - high - medium),
    },
    deadLetters: {
      tagQueue: stats.dead_letters.tag_queue,
      sourceQueue: stats.dead_letters.source_queue,
      oldestTagDeadAt: stats.dead_letters.oldest_tag_dead_at,
      oldestSourceDeadAt: stats.dead_letters.oldest_source_dead_at,
    },
  }
}
