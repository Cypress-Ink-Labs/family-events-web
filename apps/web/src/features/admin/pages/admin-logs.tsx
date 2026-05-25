import { useState } from "react"
import type { ElementType } from "react"
import {
  CircleCheck as CheckCircle,
  Circle as XCircle,
  TriangleAlert as AlertTriangle,
  RefreshCw,
  TimerOff,
} from "lucide-react"
import { toast } from "sonner"
import { useNowMs } from "@/shared/hooks/use-now-ms"
import { Toolbar } from "@/components/v2"
import { useAdminSourceRuns } from "@/features/admin/hooks/sources/use-admin-source-runs"
import { useAdminLogsRealtime } from "@/features/admin/hooks/operations/use-admin-logs-realtime"
import { useTriggerSourceScrape } from "@/features/admin/hooks/sources/use-admin-sources"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import { SOURCE_STALE_THRESHOLD_MS } from "@/shared/constants/time"
import { type RunStatus } from "@/shared/constants/status-colors"
import { SourceQueueSummaryPanel } from "@/features/admin/components/admin-logs/source-queue-summary-panel"
import { TagQueueSummaryPanel } from "@/features/admin/components/admin-logs/tag-queue-summary-panel"
import { DeadLettersPanel } from "@/features/admin/components/admin-logs/dead-letters-panel"
import { SourceRunCard } from "@/features/admin/components/admin-logs/source-run-card"

const RUN_STATUS_BADGE: Record<RunStatus, { icon: ElementType; label: string }> = {
  success: { icon: CheckCircle, label: "Success" },
  error: { icon: XCircle, label: "Error" },
  partial: { icon: AlertTriangle, label: "Partial" },
  running: { icon: RefreshCw, label: "Running" },
  timed_out: { icon: TimerOff, label: "Timed Out" },
}

function isRunStatus(status: string): status is RunStatus {
  return status in RUN_STATUS_BADGE
}

function resolveStatus(status: string, startedAt: string, nowMs: number): RunStatus {
  const normalized: RunStatus = isRunStatus(status) ? status : "error"
  if (normalized !== "running") return normalized
  const elapsed = nowMs - Date.parse(startedAt)
  return elapsed > SOURCE_STALE_THRESHOLD_MS ? "timed_out" : "running"
}

export function canRetrySourceRunStatus(status: RunStatus): boolean {
  return status === "error" || status === "partial" || status === "timed_out"
}

export function AdminLogsPage() {
  useAdminLogsRealtime()
  const { data: logs = [] } = useAdminSourceRuns()
  const triggerScrape = useTriggerSourceScrape()
  const { toastError } = useAdminToast()
  const [retryingSourceIds, setRetryingSourceIds] = useState(() => new Set<string>())
  const nowMs = useNowMs()
  const statusNowMs = nowMs ?? 0
  const hasRunning = logs.some(
    (r) => resolveStatus(r.status, r.started_at, statusNowMs) === "running"
  )

  async function handleRetryRun(sourceId: string) {
    setRetryingSourceIds((prev) => new Set(prev).add(sourceId))
    try {
      await triggerScrape.mutateAsync({ sourceId })
      toast.success("Retry queued.", { description: "A new ingestion run was started." })
    } catch (error) {
      toastError(error, "Failed to retry source run.")
    } finally {
      setRetryingSourceIds((prev) => {
        const next = new Set(prev)
        next.delete(sourceId)
        return next
      })
    }
  }

  return (
    <div className="space-y-6">
      <Toolbar
        title="Ingestion Logs"
        subtitle="Scrape run history and diagnostics"
        actions={
          hasRunning ? (
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-accent-tertiary)]">
              <RefreshCw className="size-3 animate-spin" />
              <span>Live</span>
            </div>
          ) : null
        }
      />

      <div className="grid gap-3 xl:grid-cols-2">
        <SourceQueueSummaryPanel />
        <TagQueueSummaryPanel />
      </div>
      <DeadLettersPanel />

      <div className="space-y-3">
        {logs.map((run) => {
          const resolvedStatus = resolveStatus(run.status, run.started_at, statusNowMs)
          const canRetry = Boolean(run.source_id) && canRetrySourceRunStatus(resolvedStatus)
          const isRetrying = run.source_id ? retryingSourceIds.has(run.source_id) : false
          return (
            <SourceRunCard
              key={run.id}
              run={run}
              resolvedStatus={resolvedStatus}
              statusBadge={RUN_STATUS_BADGE[resolvedStatus]}
              canRetry={canRetry}
              isRetrying={isRetrying}
              onRetry={handleRetryRun}
            />
          )
        })}
      </div>
    </div>
  )
}
