import { useEffect, useState } from "react"
import {
  CircleCheck as CheckCircle,
  Circle as XCircle,
  TriangleAlert as AlertTriangle,
  RefreshCw,
  Clock,
  Database,
  TimerOff,
  Tag as TagIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ClientDate, ClientDistanceToNow } from "@/components/client-date"
import { cn } from "@/lib/utils"
import { useNowMs } from "@/hooks/use-now-ms"
import { Toolbar } from "@/components/v2"
import { useAdminSourceRuns } from "@/features/admin/hooks/use-admin-source-runs"
import { useAdminLogsRealtime } from "@/features/admin/hooks/use-admin-logs-realtime"
import {
  useAdminDeadTagQueueRows,
  useAdminRetryTagQueue,
  type TagQueueStatus,
  useAdminTagQueueSummary,
} from "@/features/admin/hooks/use-admin-tag-queue"
import {
  type SourceQueueStatus,
  useAdminDeadSourceQueueRows,
  useAdminRetrySourceQueue,
  useAdminSourceQueueSummary,
} from "@/features/admin/hooks/use-admin-source-queue"

type RunStatus = "success" | "error" | "partial" | "running" | "timed_out"

const STALE_THRESHOLD_MS = 15 * 60 * 1000

const STATUS_CONFIG: Record<RunStatus, { icon: React.ElementType; color: string; label: string }> =
  {
    success: { icon: CheckCircle, color: "text-green-600", label: "Success" },
    error: { icon: XCircle, color: "text-destructive", label: "Error" },
    partial: { icon: AlertTriangle, color: "text-amber-500", label: "Partial" },
    running: { icon: RefreshCw, color: "text-blue-600", label: "Running" },
    timed_out: { icon: TimerOff, color: "text-amber-500", label: "Timed Out" },
  }

function isRunStatus(status: string): status is RunStatus {
  return status in STATUS_CONFIG
}

function resolveStatus(status: string, startedAt: string, nowMs: number): RunStatus {
  const normalized: RunStatus = isRunStatus(status) ? status : "error"
  if (normalized !== "running") return normalized
  const elapsed = nowMs - Date.parse(startedAt)
  return elapsed > STALE_THRESHOLD_MS ? "timed_out" : "running"
}

const QUEUE_STATUS_LABELS: Record<TagQueueStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  succeeded: "Succeeded",
  failed: "Legacy Done",
  dead: "Dead-letter",
}

const QUEUE_STATUS_TONE: Record<TagQueueStatus, string> = {
  pending: "border-blue-500/40 bg-blue-500/5 text-blue-700 dark:text-blue-300",
  processing: "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  succeeded: "border-green-500/40 bg-green-500/5 text-green-700 dark:text-green-300",
  failed: "border-border/60 bg-card text-muted-foreground",
  dead: "border-destructive/40 bg-destructive/5 text-destructive",
}

const SOURCE_QUEUE_STATUS_LABELS: Record<SourceQueueStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  retrying: "Retrying",
  succeeded: "Succeeded",
  dead: "Dead-letter",
}

const SOURCE_QUEUE_STATUS_TONE: Record<SourceQueueStatus, string> = {
  pending: "border-blue-500/40 bg-blue-500/5 text-blue-700 dark:text-blue-300",
  processing: "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  retrying: "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  succeeded: "border-green-500/40 bg-green-500/5 text-green-700 dark:text-green-300",
  dead: "border-destructive/40 bg-destructive/5 text-destructive",
}

function SourceQueueSummaryPanel() {
  const { data: rows = [], isLoading } = useAdminSourceQueueSummary()
  const byStatus = new Map(rows.map((row) => [row.status, row]))
  const order: SourceQueueStatus[] = ["pending", "processing", "retrying", "succeeded", "dead"]
  const dead = byStatus.get("dead")

  if (isLoading && rows.length === 0) {
    return null
  }

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Source scrape queue</h2>
          {dead && dead.row_count > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {dead.row_count} dead-lettered
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {order.map((status) => {
            const row = byStatus.get(status)
            return (
              <div
                key={status}
                className={cn(
                  "rounded-md border px-3 py-2",
                  SOURCE_QUEUE_STATUS_TONE[status],
                  !row && "opacity-60"
                )}
              >
                <div className="text-[10px] uppercase tracking-wide font-semibold">
                  {SOURCE_QUEUE_STATUS_LABELS[status]}
                </div>
                <div className="text-lg font-bold tabular-nums">{row?.row_count ?? 0}</div>
                {row?.oldest_enqueued_at && (
                  <div className="text-[10px] mt-0.5">
                    oldest <ClientDistanceToNow value={row.oldest_enqueued_at} addSuffix />
                  </div>
                )}
                {row?.oldest_processing_started_at && (
                  <div className="text-[10px] mt-0.5">
                    active{" "}
                    <ClientDistanceToNow value={row.oldest_processing_started_at} addSuffix />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function TagQueueSummaryPanel() {
  const { data: rows = [], isLoading } = useAdminTagQueueSummary()
  const byStatus = new Map(rows.map((row) => [row.status, row]))
  const order: TagQueueStatus[] = ["pending", "processing", "succeeded", "failed", "dead"]
  const dead = byStatus.get("dead")

  if (isLoading && rows.length === 0) {
    return null
  }

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <TagIcon className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Tag-event queue</h2>
          {dead && dead.row_count > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {dead.row_count} dead-lettered
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {order.map((status) => {
            const row = byStatus.get(status)
            return (
              <div
                key={status}
                className={cn(
                  "rounded-md border px-3 py-2",
                  QUEUE_STATUS_TONE[status],
                  !row && "opacity-60"
                )}
              >
                <div className="text-[10px] uppercase tracking-wide font-semibold">
                  {QUEUE_STATUS_LABELS[status]}
                </div>
                <div className="text-lg font-bold tabular-nums">{row?.row_count ?? 0}</div>
                {row?.oldest_enqueued_at && (
                  <div className="text-[10px] mt-0.5">
                    oldest <ClientDistanceToNow value={row.oldest_enqueued_at} addSuffix />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function DeadLettersPanel() {
  const { data: sourceRows = [] } = useAdminDeadSourceQueueRows()
  const { data: tagRows = [] } = useAdminDeadTagQueueRows()
  const retrySource = useAdminRetrySourceQueue()
  const retryTag = useAdminRetryTagQueue()
  const hasRows = sourceRows.length > 0 || tagRows.length > 0

  if (!hasRows) return null

  return (
    <Card className="border-destructive/30">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" />
          <h2 className="text-sm font-semibold text-foreground">Dead letters</h2>
        </div>
        {sourceRows.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Sources</h3>
            {sourceRows.map((row) => (
              <div
                key={`source-${row.id}`}
                className="flex flex-col gap-2 rounded-md border border-border/60 p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="text-sm font-medium">
                    {row.event_sources?.name ?? row.source_id ?? "Unknown source"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {row.attempt_count} attempts
                    {row.finished_at ? (
                      <>
                        {" "}
                        · <ClientDistanceToNow value={row.finished_at} addSuffix />
                      </>
                    ) : null}
                  </div>
                  {row.last_error && (
                    <p className="line-clamp-2 font-mono text-xs text-destructive">
                      {row.last_error}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={retrySource.isPending}
                  onClick={() => retrySource.mutate(row.id)}
                >
                  Retry
                </Button>
              </div>
            ))}
          </div>
        )}
        {tagRows.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Tags</h3>
            {tagRows.map((row) => (
              <div
                key={`tag-${row.id}`}
                className="flex flex-col gap-2 rounded-md border border-border/60 p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="text-sm font-medium">{row.events?.title ?? row.event_id}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.attempt_count} attempts
                    {row.finished_at ? (
                      <>
                        {" "}
                        · <ClientDistanceToNow value={row.finished_at} addSuffix />
                      </>
                    ) : null}
                  </div>
                  {row.last_error && (
                    <p className="line-clamp-2 font-mono text-xs text-destructive">
                      {row.last_error}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={retryTag.isPending}
                  onClick={() => retryTag.mutate(row.event_id)}
                >
                  Retry
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(startedAt).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  return <span className="tabular-nums">{mins > 0 ? `${mins}m ${secs}s` : `${secs}s`} elapsed</span>
}

export function AdminLogsPage() {
  useAdminLogsRealtime()
  const { data: logs = [] } = useAdminSourceRuns()
  const nowMs = useNowMs()
  const statusNowMs = nowMs ?? 0
  const hasRunning = logs.some(
    (r) => resolveStatus(r.status, r.started_at, statusNowMs) === "running"
  )

  return (
    <div className="space-y-6">
      <Toolbar
        title="Ingestion Logs"
        subtitle="Scrape run history and diagnostics"
        actions={
          hasRunning ? (
            <div className="flex items-center gap-1.5 text-xs text-blue-600">
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
          const status = STATUS_CONFIG[resolvedStatus]
          const isRunning = resolvedStatus === "running"
          const isTimedOut = resolvedStatus === "timed_out"
          const duration =
            !isRunning && run.completed_at
              ? Math.round((Date.parse(run.completed_at) - Date.parse(run.started_at)) / 1000)
              : isTimedOut
                ? Math.round(STALE_THRESHOLD_MS / 1000)
                : null

          return (
            <Card
              key={run.id}
              className={cn(
                "border-border/60",
                isRunning && "border-blue-500/30 bg-blue-500/5",
                isTimedOut && "border-amber-500/30 bg-amber-500/5"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn("mt-0.5 shrink-0", status.color)}>
                    <status.icon className={cn("size-5", isRunning && "animate-spin")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm text-foreground">
                        {run.event_sources?.name || "Unknown source"}
                      </h3>
                      <Badge
                        variant={
                          resolvedStatus === "success"
                            ? "secondary"
                            : resolvedStatus === "error" || resolvedStatus === "timed_out"
                              ? "destructive"
                              : "outline"
                        }
                        className={cn(
                          "text-[10px]",
                          isRunning && "border-blue-500/40 text-blue-600",
                          isTimedOut && "border-amber-500/40 text-amber-600"
                        )}
                      >
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        <ClientDate value={run.started_at} pattern="MMM d, h:mm a" />
                      </span>
                      {isRunning ? (
                        <ElapsedTimer startedAt={run.started_at} />
                      ) : (
                        duration !== null && (
                          <span>
                            {duration >= 60
                              ? `${Math.floor(duration / 60)}m ${duration % 60}s`
                              : `${duration}s`}{" "}
                            {isTimedOut ? "before timeout" : "duration"}
                          </span>
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs flex-wrap">
                      <span
                        className={cn(
                          "font-medium",
                          run.events_imported > 0 ? "text-green-600" : "text-muted-foreground"
                        )}
                      >
                        +{run.events_imported} imported
                      </span>
                      <span className="text-muted-foreground">{run.events_skipped} skipped</span>
                      <span className="text-muted-foreground">
                        {run.events_found > 0
                          ? `${run.events_found} found`
                          : isRunning
                            ? "fetching…"
                            : "0 found"}
                      </span>
                    </div>
                    {run.error_log && (
                      <div className="mt-2 rounded-lg bg-destructive/5 border border-destructive/20 p-2">
                        <p className="text-xs text-destructive font-mono leading-relaxed">
                          {run.error_log}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
