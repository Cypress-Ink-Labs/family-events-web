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
  Trash2,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ClientDate, ClientDistanceToNow } from "@/components/client-date"
import { cn } from "@/lib/utils"
import { useNowMs } from "@/hooks/use-now-ms"
import { Toolbar } from "@/components/v2"
import { useAdminSourceRuns } from "@/features/admin/hooks/sources/use-admin-source-runs"
import { useAdminLogsRealtime } from "@/features/admin/hooks/operations/use-admin-logs-realtime"
import {
  useAdminDeadTagQueueRows,
  useAdminRetryTagQueue,
  useDeleteDeadTagQueueRow,
  useAdminTagQueueSummary,
} from "@/features/admin/hooks/operations/use-admin-tag-queue"
import {
  useAdminDeadSourceQueueRows,
  useAdminRetrySourceQueue,
  useDeleteDeadSourceQueueRow,
  useAdminSourceQueueSummary,
} from "@/features/admin/hooks/sources/use-admin-source-queue"
import { useTriggerSourceScrape } from "@/features/admin/hooks/sources/use-admin-sources"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import { toast } from "sonner"

import { SOURCE_STALE_THRESHOLD_MS } from "@/shared/constants/time"
import {
  QUEUE_STATUS_TONE,
  RUN_STATUS_TEXT_CLASS,
  type RunStatus,
} from "@/shared/constants/status-colors"
import {
  SOURCE_QUEUE_ORDER,
  SOURCE_QUEUE_STATUS_LABELS,
  TAG_QUEUE_ORDER,
  TAG_QUEUE_STATUS_LABELS,
} from "@/features/admin/constants/queue"

const RUN_STATUS_BADGE: Record<RunStatus, { icon: React.ElementType; label: string }> = {
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

interface QueueSummaryRow<Status extends string> {
  status: Status
  row_count: number
  oldest_enqueued_at: string | null
  oldest_processing_started_at?: string | null
}

interface QueueSummaryPanelProps<Status extends string> {
  title: string
  icon: React.ElementType
  rows: QueueSummaryRow<Status>[]
  isLoading: boolean
  order: readonly Status[]
  labels: Record<Status, string>
  tones: Record<Status, string>
  deadStatus: Status
  activeTimestampKey?: "oldest_processing_started_at"
}

function QueueSummaryPanel<Status extends string>({
  title,
  icon: Icon,
  rows,
  isLoading,
  order,
  labels,
  tones,
  deadStatus,
  activeTimestampKey,
}: QueueSummaryPanelProps<Status>) {
  const byStatus = new Map<Status, QueueSummaryRow<Status>>(rows.map((row) => [row.status, row]))
  const dead = byStatus.get(deadStatus)

  if (isLoading && rows.length === 0) return null

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
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
                className={cn("rounded-md border px-3 py-2", tones[status], !row && "opacity-60")}
              >
                <div className="text-[10px] uppercase tracking-wide font-semibold">
                  {labels[status]}
                </div>
                <div className="text-lg font-bold tabular-nums">{row?.row_count ?? 0}</div>
                {row?.oldest_enqueued_at && (
                  <div className="text-[10px] mt-0.5">
                    oldest <ClientDistanceToNow value={row.oldest_enqueued_at} addSuffix />
                  </div>
                )}
                {activeTimestampKey && row?.[activeTimestampKey] && (
                  <div className="text-[10px] mt-0.5">
                    active <ClientDistanceToNow value={row[activeTimestampKey]} addSuffix />
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

function SourceQueueSummaryPanel() {
  const { data: rows = [], isLoading } = useAdminSourceQueueSummary()

  return (
    <QueueSummaryPanel
      title="Source scrape queue"
      icon={Database}
      rows={rows}
      isLoading={isLoading}
      order={SOURCE_QUEUE_ORDER}
      labels={SOURCE_QUEUE_STATUS_LABELS}
      tones={QUEUE_STATUS_TONE}
      deadStatus="dead"
      activeTimestampKey="oldest_processing_started_at"
    />
  )
}

function TagQueueSummaryPanel() {
  const { data: rows = [], isLoading } = useAdminTagQueueSummary()

  return (
    <QueueSummaryPanel
      title="Tag-event queue"
      icon={TagIcon}
      rows={rows}
      isLoading={isLoading}
      order={TAG_QUEUE_ORDER}
      labels={TAG_QUEUE_STATUS_LABELS}
      tones={QUEUE_STATUS_TONE}
      deadStatus="dead"
    />
  )
}

interface DeadLetterBaseRow {
  id: number
  attempt_count: number
  finished_at: string | null
  last_error: string | null
}

interface DeadLetterSectionProps<Row extends DeadLetterBaseRow, RetryId extends string | number> {
  heading: string
  rows: Row[]
  keyPrefix: string
  retryPending: boolean
  deletePending: boolean
  titleForRow: (row: Row) => string
  retryIdForRow: (row: Row) => RetryId
  onRetry: (id: RetryId) => void
  onDelete: (id: number) => void
}

function DeadLetterSection<Row extends DeadLetterBaseRow, RetryId extends string | number>({
  heading,
  rows,
  keyPrefix,
  retryPending,
  deletePending,
  titleForRow,
  retryIdForRow,
  onRetry,
  onDelete,
}: DeadLetterSectionProps<Row, RetryId>) {
  if (rows.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground">{heading}</h3>
      {rows.map((row) => (
        <div
          key={`${keyPrefix}-${row.id}`}
          className="flex flex-col gap-2 rounded-md border border-border/60 p-3 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-medium">{titleForRow(row)}</div>
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
              <p className="line-clamp-2 font-mono text-xs text-destructive">{row.last_error}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 self-end sm:self-start">
            <Button
              size="sm"
              variant="outline"
              disabled={retryPending}
              onClick={() => onRetry(retryIdForRow(row))}
            >
              Retry
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-8 p-0 text-muted-foreground hover:text-destructive"
                  disabled={deletePending}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete entry?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This dead-letter row will be permanently removed and cannot be recovered.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(row.id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  )
}

function DeadLettersPanel() {
  const { data: sourceRows = [] } = useAdminDeadSourceQueueRows()
  const { data: tagRows = [] } = useAdminDeadTagQueueRows()
  const retrySource = useAdminRetrySourceQueue()
  const retryTag = useAdminRetryTagQueue()
  const deleteSource = useDeleteDeadSourceQueueRow()
  const deleteTag = useDeleteDeadTagQueueRow()
  const hasRows = sourceRows.length > 0 || tagRows.length > 0

  if (!hasRows) return null

  return (
    <Card className="border-destructive/30">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" />
          <h2 className="text-sm font-semibold text-foreground">Dead letters</h2>
        </div>
        <DeadLetterSection
          heading="Sources"
          rows={sourceRows}
          keyPrefix="source"
          retryPending={retrySource.isPending}
          deletePending={deleteSource.isPending}
          titleForRow={(row) => row.event_sources?.name ?? row.source_id ?? "Unknown source"}
          retryIdForRow={(row) => row.id}
          onRetry={(queueId) => retrySource.mutate(queueId)}
          onDelete={(queueId) => deleteSource.mutate(queueId)}
        />
        <DeadLetterSection
          heading="Tags"
          rows={tagRows}
          keyPrefix="tag"
          retryPending={retryTag.isPending}
          deletePending={deleteTag.isPending}
          titleForRow={(row) => row.events?.title ?? row.event_id}
          retryIdForRow={(row) => row.event_id}
          onRetry={(eventId) => retryTag.mutate(eventId)}
          onDelete={(queueId) => deleteTag.mutate(queueId)}
        />
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
          const status = RUN_STATUS_BADGE[resolvedStatus]
          const statusColor = RUN_STATUS_TEXT_CLASS[resolvedStatus]
          const isRunning = resolvedStatus === "running"
          const isTimedOut = resolvedStatus === "timed_out"
          const canRetry = Boolean(run.source_id) && canRetrySourceRunStatus(resolvedStatus)
          const isRetrying = run.source_id ? retryingSourceIds.has(run.source_id) : false
          const duration =
            !isRunning && run.completed_at
              ? Math.round((Date.parse(run.completed_at) - Date.parse(run.started_at)) / 1000)
              : isTimedOut
                ? Math.round(SOURCE_STALE_THRESHOLD_MS / 1000)
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
                  <div className={cn("mt-0.5 shrink-0", statusColor)}>
                    <status.icon className={cn("size-5", isRunning && "animate-spin")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
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
                      {canRetry && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-h-8 shrink-0 gap-1.5 self-start"
                          disabled={isRetrying}
                          onClick={() => run.source_id && void handleRetryRun(run.source_id)}
                        >
                          <RefreshCw className={cn("size-3.5", isRetrying && "animate-spin")} />
                          {isRetrying ? "Retrying..." : "Retry"}
                        </Button>
                      )}
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
