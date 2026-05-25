import { Clock, RefreshCw } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { ClientDate } from "@/shared/components/client-date"
import { cn } from "@/shared/utils/format"
import { RUN_STATUS_TEXT_CLASS, type RunStatus } from "@/shared/constants/status-colors"
import { SOURCE_STALE_THRESHOLD_MS } from "@/shared/constants/time"
import { ElapsedTimer } from "@/features/admin/components/admin-logs/elapsed-timer"
import type { ElementType } from "react"

export interface SourceRunCardProps {
  run: {
    id: string
    status: string
    started_at: string
    completed_at?: string | null
    events_imported: number
    events_skipped: number
    events_found: number
    error_log?: string | null
    source_id?: string | null
    event_sources?: { name?: string | null } | null
  }
  resolvedStatus: RunStatus
  statusBadge: { icon: ElementType; label: string }
  canRetry: boolean
  isRetrying: boolean
  onRetry: (sourceId: string) => void
}

export function SourceRunCard({
  run,
  resolvedStatus,
  statusBadge,
  canRetry,
  isRetrying,
  onRetry,
}: SourceRunCardProps) {
  const StatusIcon = statusBadge.icon
  const statusColor = RUN_STATUS_TEXT_CLASS[resolvedStatus]
  const isRunning = resolvedStatus === "running"
  const isTimedOut = resolvedStatus === "timed_out"
  const duration =
    !isRunning && run.completed_at
      ? Math.round((Date.parse(run.completed_at) - Date.parse(run.started_at)) / 1000)
      : isTimedOut
        ? Math.round(SOURCE_STALE_THRESHOLD_MS / 1000)
        : null

  return (
    <Card
      className={cn(
        "border-border/60",
        isRunning && "border-[var(--color-accent-tertiary)]/30 bg-[var(--color-accent-tertiary)]/5",
        isTimedOut && "border-amber-500/30 bg-amber-500/5"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("mt-0.5 shrink-0", statusColor)}>
            <StatusIcon className={cn("size-5", isRunning && "animate-spin")} />
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
                    isRunning &&
                      "border-[var(--color-accent-tertiary)]/40 text-[var(--color-accent-tertiary)]",
                    isTimedOut && "border-amber-500/40 text-amber-600"
                  )}
                >
                  {statusBadge.label}
                </Badge>
              </div>
              {canRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-8 shrink-0 gap-1.5 self-start"
                  disabled={isRetrying}
                  onClick={() => run.source_id && void onRetry(run.source_id)}
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
                  run.events_imported > 0 ? "text-[var(--color-success)]" : "text-muted-foreground"
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
}
