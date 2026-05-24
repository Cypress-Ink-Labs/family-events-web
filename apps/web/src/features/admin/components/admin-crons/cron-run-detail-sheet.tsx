import { Loader2 } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { ClientDate } from "@/shared/components/client-date"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { cn } from "@/shared/utils/format"
import { useAdminRailwayCronRunDetail } from "@/features/admin/hooks/operations/use-admin-crons"
import type { CronRun, CronRunLogEntry } from "@/features/admin/types"
import { RunStatusBadge } from "@/features/admin/components/admin-crons/run-status-badge"

type LogFilter = "all" | "supabase" | "railway"
const EMPTY_LOGS: CronRunLogEntry[] = []

function durationLabel(durationMs: number | null) {
  if (durationMs == null) return null
  if (durationMs < 1000) return `${durationMs}ms`
  return `${(durationMs / 1000).toFixed(1)}s`
}

function levelVariant(level: CronRunLogEntry["level"]) {
  if (level === "error") return "destructive"
  if (level === "warn") return "outline"
  return "secondary"
}

function hasMetadata(metadata: Record<string, unknown>) {
  return Object.keys(metadata).length > 0
}

function LogEntryRow({ entry }: { entry: CronRunLogEntry }) {
  return (
    <div className="grid gap-2 border-b border-border/50 py-3 last:border-0 sm:grid-cols-[132px_1fr]">
      <div className="space-y-1 text-xs text-muted-foreground">
        <ClientDate value={entry.created_at} pattern="MMM d, h:mm:ss a" />
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[10px] capitalize">
            {entry.provider}
          </Badge>
          <Badge variant={levelVariant(entry.level)} className="text-[10px] uppercase">
            {entry.level}
          </Badge>
        </div>
      </div>
      <div className="min-w-0 space-y-2">
        <p className="break-words text-sm font-medium text-foreground">{entry.message}</p>
        {hasMetadata(entry.metadata) && (
          <details className="group rounded-md border border-border/60 bg-muted/20">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">
              Metadata
            </summary>
            <pre className="max-h-56 overflow-auto border-t border-border/60 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {JSON.stringify(entry.metadata, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

export function CronRunDetailSheet({
  run,
  open,
  onOpenChange,
}: {
  run: CronRun | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [filter, setFilter] = useState<LogFilter>("all")
  const isRailwayRun = run?.provider === "railway"
  const detailQuery = useAdminRailwayCronRunDetail(
    isRailwayRun && run ? run.runid : null,
    open && isRailwayRun
  )
  const detail = detailQuery.data
  const logs = detail?.logs ?? EMPTY_LOGS
  const visibleLogs = filter === "all" ? logs : logs.filter((entry) => entry.provider === filter)
  const responseText = detail?.body ?? run?.return_message ?? null
  const httpStatus = detail?.http_status ?? null
  const durationMs =
    detail?.duration_s != null ? detail.duration_s * 1000 : (run?.duration_ms ?? null)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-hidden p-0 sm:max-w-3xl">
        <SheetHeader className="border-b border-border/60 pr-12">
          <div className="space-y-2">
            <SheetTitle className="break-all font-display text-lg font-medium">
              {run?.jobname ?? "Cron run"}
            </SheetTitle>
            <SheetDescription>
              {run ? (
                <ClientDate value={run.start_time} pattern="MMM d, yyyy h:mm:ss a" />
              ) : (
                "No run selected"
              )}
            </SheetDescription>
          </div>
          {run && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <RunStatusBadge status={run.status} />
              <Badge variant="outline" className="text-[10px] capitalize">
                {run.provider === "railway" ? "Railway" : "Supabase"}
              </Badge>
              {httpStatus != null && (
                <Badge variant="secondary" className="font-mono text-[10px]">
                  HTTP {httpStatus}
                </Badge>
              )}
              {durationLabel(durationMs) && (
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {durationLabel(durationMs)}
                </Badge>
              )}
            </div>
          )}
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          {isRailwayRun && (
            <div className="border-b border-border/60 px-4 py-3">
              <Tabs value={filter} onValueChange={(value) => setFilter(value as LogFilter)}>
                <TabsList className="h-9">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="supabase">Supabase</TabsTrigger>
                  <TabsTrigger value="railway">Railway</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-auto px-4">
            {detailQuery.isLoading ? (
              <div className="flex min-h-32 items-center justify-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : detailQuery.isError ? (
              <div className="py-6 text-sm text-destructive">Could not load cron run logs.</div>
            ) : visibleLogs.length > 0 ? (
              <div>
                {visibleLogs.map((entry) => (
                  <LogEntryRow key={entry.id} entry={entry} />
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No captured logs for this run
              </div>
            )}

            {responseText && (
              <div className={cn("space-y-2 py-4", visibleLogs.length > 0 && "border-t")}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Response</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => void navigator.clipboard?.writeText(responseText)}
                  >
                    Copy
                  </Button>
                </div>
                <pre className="max-h-72 overflow-auto rounded-md border border-border/60 bg-muted/20 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {responseText}
                </pre>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
