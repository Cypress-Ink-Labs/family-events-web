import { useMemo, useState } from "react"
import {
  Clock,
  Play,
  CircleCheck as CheckCircle,
  Circle as XCircle,
  Loader2,
  CalendarClock,
  ChevronDown,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClientDate, ClientDistanceToNow } from "@/components/client-date"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { FilterBar, Toolbar } from "@/components/v2"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import {
  useAdminCronHistory,
  useAdminRailwayCronJobs,
  useAdminRailwayCronHistory,
  useRunDueScrapes,
} from "@/features/admin/hooks/use-admin-crons"
import type { CronRun, RailwayCronJob } from "@/features/admin/hooks/admin-types"
import { railwayCronRunToCronRun } from "@/features/admin/hooks/admin-types"

const ALL_RUNS_DOMAIN = "all"

const CADENCE_SUFFIXES = new Set([
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "nightly",
  "quarter-hourly",
])

const DOMAIN_LABEL_OVERRIDES: Record<string, string> = {
  ai: "AI",
  ical: "iCal",
  rss: "RSS",
  url: "URL",
}

export function getCronRunDomain(jobName: string) {
  const parts = jobName.split("-").filter(Boolean)

  while (parts.length > 1 && CADENCE_SUFFIXES.has(parts[parts.length - 1])) {
    parts.pop()
  }

  const key = parts.join("-") || jobName
  const label =
    parts
      .map((part) => DOMAIN_LABEL_OVERRIDES[part] ?? part[0].toUpperCase() + part.slice(1))
      .join(" ") || jobName

  return { key, label }
}

export function groupCronRunsByDomain(runs: CronRun[]) {
  const groups = new Map<string, { key: string; label: string; runs: CronRun[] }>()

  for (const run of runs) {
    const domain = getCronRunDomain(run.jobname)
    const group = groups.get(domain.key)

    if (group) {
      group.runs.push(run)
      continue
    }

    groups.set(domain.key, { ...domain, runs: [run] })
  }

  return [...groups.values()]
}

// pg_cron uses 'succeeded'/'failed'/'starting' — map to display values
function normalizeCronStatus(status: string | null): "success" | "failed" | "running" | "unknown" {
  if (!status) return "unknown"
  if (status === "succeeded") return "success"
  if (status === "failed") return "failed"
  if (status === "starting") return "running"
  return "unknown"
}

const STATUS_CONFIG = {
  success: { icon: CheckCircle, color: "text-green-600", label: "Succeeded" },
  failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
  running: { icon: Loader2, color: "text-blue-600", label: "Running" },
  unknown: { icon: Clock, color: "text-muted-foreground", label: "Unknown" },
} as const

function RunStatusBadge({ status }: { status: string | null }) {
  const key = normalizeCronStatus(status)
  const cfg = STATUS_CONFIG[key]
  return (
    <div className={cn("flex items-center gap-1", cfg.color)}>
      <cfg.icon className={cn("size-3.5", key === "running" && "animate-spin")} />
      <span className="text-xs font-medium">{cfg.label}</span>
    </div>
  )
}

function RailwayCronJobCard({ job }: { job: RailwayCronJob }) {
  const label = job.label
    .split("-")
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ")

  return (
    <Card className="@container/cron-card border-border/60">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <CalendarClock className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="break-all font-display text-sm font-medium text-foreground">
                {job.label}
              </h3>
              <Badge variant="secondary" className="text-[10px]">
                Railway
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {job.last_run_status ? (
            <>
              <RunStatusBadge status={job.last_run_status} />
              {job.last_run_at && (
                <span>
                  <ClientDistanceToNow value={job.last_run_at} addSuffix />
                </span>
              )}
              {job.last_run_duration_s != null && (
                <span className="font-mono tabular-nums">{job.last_run_duration_s}s</span>
              )}
              {job.last_http_status != null && (
                <span className="font-mono tabular-nums text-muted-foreground/60">
                  HTTP {job.last_http_status}
                </span>
              )}
            </>
          ) : (
            <span>Never run</span>
          )}
        </div>
        <p className="truncate font-mono text-[10px] text-muted-foreground/60">{label}</p>
      </CardContent>
    </Card>
  )
}

function RunHistoryRow({ run }: { run: CronRun }) {
  const key = normalizeCronStatus(run.status)
  const cfg = STATUS_CONFIG[key]

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

function RunDomainChip({ label, count, active, onClick }: RunDomainChipProps) {
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
  group: { key: string; label: string; runs: CronRun[] }
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

function RunHistory({ history, selectedDomain }: { history: CronRun[]; selectedDomain: string }) {
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

export function AdminCronsPage() {
  // pg_cron is fully migrated off Supabase — see migration
  // 20260601006600_consolidate_remaining_pg_cron.sql. Worker BGWorker on
  // Supabase Cloud has been unreliable (jobs marked active fire sporadically
  // and cron.job_run_details never matches by jobid). All cron work now runs
  // on Railway. cron history is still pulled from cron.job_run_details for
  // historical visibility but no editable pg_cron job cards are surfaced.
  const { data: history = [] } = useAdminCronHistory()
  const { data: railwayJobs = [], isLoading: railwayJobsLoading } = useAdminRailwayCronJobs()
  const { data: railwayHistory = [] } = useAdminRailwayCronHistory()
  const runDueScrapes = useRunDueScrapes()
  const { toastError } = useAdminToast()
  const [selectedDomain, setSelectedDomain] = useState(ALL_RUNS_DOMAIN)

  const combinedHistory = useMemo(() => {
    const normalized = railwayHistory.map(railwayCronRunToCronRun)
    return [...history, ...normalized].sort(
      (a, b) => Date.parse(b.start_time) - Date.parse(a.start_time)
    )
  }, [history, railwayHistory])

  const historyGroups = useMemo(() => groupCronRunsByDomain(combinedHistory), [combinedHistory])

  async function handleRunNow() {
    try {
      await runDueScrapes.mutateAsync()
      toast.success("Sweep triggered", { description: "All due sources queued for scraping." })
    } catch (error) {
      toastError(error, "Failed to trigger sweep.")
    }
  }

  return (
    <div className="space-y-6">
      <Toolbar
        title="Scheduled Jobs"
        subtitle="Railway cron services and run history"
        actions={
          <Button
            className="min-h-[44px] gap-2"
            onClick={handleRunNow}
            disabled={runDueScrapes.isPending}
          >
            {runDueScrapes.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            <span>Run All Due Now</span>
          </Button>
        }
      />

      {/* Railway cron service cards */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Railway Services
        </p>
        {railwayJobsLoading ? (
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="h-16 animate-pulse bg-muted rounded-lg" />
            </CardContent>
          </Card>
        ) : railwayJobs.length === 0 ? (
          <Card className="border-dashed border-border/60 bg-muted/20">
            <CardContent className="p-8 text-center">
              <CalendarClock className="size-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No Railway cron services found</p>
            </CardContent>
          </Card>
        ) : (
          railwayJobs.map((job) => <RailwayCronJobCard key={job.label} job={job} />)
        )}
      </div>

      {/* Combined run history */}
      <Card className="border-border/60">
        <CardHeader className="space-y-3 pb-3">
          <CardTitle className="text-sm font-semibold">Recent Runs</CardTitle>
          {historyGroups.length > 1 && (
            <FilterBar>
              <RunDomainChip
                label="All"
                count={combinedHistory.length}
                active={selectedDomain === ALL_RUNS_DOMAIN}
                onClick={() => setSelectedDomain(ALL_RUNS_DOMAIN)}
              />
              {historyGroups.map((group) => (
                <RunDomainChip
                  key={group.key}
                  label={group.label}
                  count={group.runs.length}
                  active={selectedDomain === group.key}
                  onClick={() => setSelectedDomain(group.key)}
                />
              ))}
            </FilterBar>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <RunHistory history={combinedHistory} selectedDomain={selectedDomain} />
        </CardContent>
      </Card>
    </div>
  )
}
