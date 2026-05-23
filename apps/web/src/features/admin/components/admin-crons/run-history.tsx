import { useMemo } from "react"
import { ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ClientDate } from "@/components/client-date"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/shared/utils/format"
import type { CronRun } from "@/features/admin/types"
import {
  ALL_RUNS_DOMAIN,
  type CronDomainGroup,
  groupCronRunsByDomain,
} from "@/features/admin/components/admin-crons/cron-domain"
import {
  CRON_STATUS_CONFIG,
  normalizeCronStatus,
} from "@/features/admin/components/admin-crons/run-status-badge"

function RunHistoryRow({ run }: { run: CronRun }) {
  const key = normalizeCronStatus(run.status)
  const cfg = CRON_STATUS_CONFIG[key]

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
      <cfg.icon className={cn("size-3.5 shrink-0", cfg.color)} />
      <span className="text-xs font-medium text-muted-foreground w-36 shrink-0 truncate">
        {run.jobname}
      </span>
      <span className="text-xs text-muted-foreground flex-1">
        <ClientDate value={run.start_time} pattern="MMM d, h:mm:ss a" />
      </span>
      {run.duration_ms != null && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {run.duration_ms < 1000
            ? `${run.duration_ms}ms`
            : `${(run.duration_ms / 1000).toFixed(1)}s`}
        </span>
      )}
      {run.return_message && key === "failed" && (
        <span className="text-xs text-destructive truncate max-w-48" title={run.return_message}>
          {run.return_message}
        </span>
      )}
    </div>
  )
}

interface RunDomainChipProps {
  label: string
  count: number
  active: boolean
  onClick: () => void
}

export function RunDomainChip({ label, count, active, onClick }: RunDomainChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[36px] shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border hover:bg-accent"
      )}
    >
      <span>{label}</span>
      <Badge
        variant={active ? "outline" : "secondary"}
        className={cn(
          "text-[10px]",
          active && "border-primary-foreground/40 bg-primary-foreground/20 text-primary-foreground"
        )}
      >
        {count}
      </Badge>
    </button>
  )
}

function RunHistoryDomainGroup({
  group,
  defaultOpen,
}: {
  group: CronDomainGroup
  defaultOpen: boolean
}) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <Card className="border-border/60 bg-transparent">
        <CollapsibleTrigger className="w-full group">
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
              <h3 className="truncate text-xs font-semibold text-foreground">{group.label}</h3>
              <Badge variant="outline" className="text-[10px]">
                {group.runs.length}
              </Badge>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border/60 px-3">
            {group.runs.map((run) => (
              <RunHistoryRow key={run.runid} run={run} />
            ))}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

export function RunHistory({
  history,
  selectedDomain,
}: {
  history: CronRun[]
  selectedDomain: string
}) {
  const groups = useMemo(() => groupCronRunsByDomain(history), [history])
  const visibleGroups =
    selectedDomain === ALL_RUNS_DOMAIN
      ? groups
      : groups.filter((group) => group.key === selectedDomain)

  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No run history yet</p>
  }

  return (
    <div className="space-y-2">
      {visibleGroups.map((group) => (
        <RunHistoryDomainGroup
          key={group.key}
          group={group}
          defaultOpen={selectedDomain !== ALL_RUNS_DOMAIN || groups.length === 1}
        />
      ))}
    </div>
  )
}
