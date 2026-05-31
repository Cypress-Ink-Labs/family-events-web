import { Calendar, Database, CircleCheck as CheckCircle, Clock } from "lucide-react"
import { useDocumentTitle } from "@/shared/hooks/use-document-title"
import {
  AdminDashboardConfidenceCard,
  AdminDashboardHeader,
  AdminDashboardIngestionChart,
  AdminDashboardPresence,
  AdminDashboardRecentRuns,
  AdminDashboardStatsGrid,
} from "@/features/admin/components/admin-dashboard-sections"
import { AdminPipelineLearning } from "@/features/admin/components/admin-pipeline-learning"
import { useAdminSourceRuns } from "@/features/admin/hooks/sources/use-admin-source-runs"
import { useAdminStats } from "@/features/admin/hooks/operations/use-admin-stats"
import { useAdminPipelineStats } from "@/features/admin/hooks/operations/use-admin-pipeline-stats"
import { useAdminDashboardPresence } from "@/features/admin/hooks/operations/use-admin-dashboard-presence"
import { useAdminEventsRealtime } from "@/features/admin/hooks/operations/use-admin-events-realtime"

export function AdminDashboardPage() {
  useDocumentTitle("Admin Dashboard")
  useAdminEventsRealtime()
  const { data: stats, isLoading: isStatsLoading } = useAdminStats()
  const { data: runs = [], isLoading: isRunsLoading } = useAdminSourceRuns()
  const { data: pipelineStats, isLoading: isPipelineStatsLoading } = useAdminPipelineStats()
  const presenceUsers = useAdminDashboardPresence()

  const STAT_CARDS = [
    {
      label: "Total Events",
      value: stats?.totalEvents ?? 0,
      delta: "Across all statuses",
      icon: Calendar,
      color: "text-primary",
    },
    {
      label: "Pending Review",
      value: stats?.pendingReview ?? 0,
      delta: "Needs attention",
      icon: Clock,
      color: "text-amber-600",
    },
    {
      label: "Active Sources",
      value: stats?.activeSources ?? 0,
      delta: `${stats?.sourceErrors ?? 0} with errors`,
      icon: Database,
      color: "text-[var(--color-accent-tertiary)]",
    },
    {
      label: "Published",
      value: stats?.published ?? 0,
      delta: stats?.totalEvents
        ? `${Math.round((stats.published / stats.totalEvents) * 100)}% publish rate`
        : "No events yet",
      icon: CheckCircle,
      color: "text-[var(--color-success)]",
    },
  ]

  const byDay = new Map<string, { imported: number; skipped: number; errors: number }>()
  for (const run of runs) {
    const day = new Date(run.started_at).toLocaleDateString("en-US", { weekday: "short" })
    const current = byDay.get(day) ?? { imported: 0, skipped: 0, errors: 0 }
    current.imported += run.events_imported
    current.skipped += run.events_skipped
    current.errors += run.status === "error" ? 1 : 0
    byDay.set(day, current)
  }

  const INGESTION_DATA = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
    day,
    imported: byDay.get(day)?.imported ?? 0,
    skipped: byDay.get(day)?.skipped ?? 0,
    errors: byDay.get(day)?.errors ?? 0,
  }))

  const RECENT_RUNS = runs.slice(0, 4).map((run) => ({
    source: run.event_sources?.name || "Unknown source",
    status: run.status,
    imported: run.events_imported,
    time: new Date(run.started_at).toLocaleString(),
  }))

  return (
    <div className="space-y-6">
      <AdminDashboardHeader
        title="Admin Dashboard"
        description="Overview of your Family Events platform"
      />
      <AdminDashboardPresence users={presenceUsers} />
      <AdminDashboardStatsGrid stats={STAT_CARDS} isLoading={isStatsLoading} />
      <AdminDashboardIngestionChart data={INGESTION_DATA} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AdminDashboardRecentRuns runs={RECENT_RUNS} isLoading={isRunsLoading} />
        <AdminDashboardConfidenceCard
          items={[
            { label: "High confidence (>0.9)", value: stats?.aiBuckets.high ?? 0 },
            { label: "Medium (0.7-0.9)", value: stats?.aiBuckets.medium ?? 0 },
            { label: "Low (<0.7)", value: stats?.aiBuckets.low ?? 0 },
          ]}
          published={stats?.published ?? 0}
          pendingReview={stats?.pendingReview ?? 0}
        />
      </div>
      <AdminPipelineLearning stats={pipelineStats} isLoading={isPipelineStatsLoading} />
    </div>
  )
}
