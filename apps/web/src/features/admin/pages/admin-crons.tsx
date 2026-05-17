import { useEffect, useMemo, useState } from "react"
import {
  Clock,
  Play,
  CircleCheck as CheckCircle,
  Circle as XCircle,
  Loader2,
  CalendarClock,
  ChevronDown,
  Pencil,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClientDate, ClientDistanceToNow } from "@/components/client-date"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { FilterBar, Toolbar } from "@/components/v2"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import {
  useAdminCronJobs,
  useAdminCronHistory,
  useToggleCronJob,
  useSetCronSchedule,
  useRunDueScrapes,
} from "@/features/admin/hooks/use-admin-crons"
import type { CronJob, CronRun } from "@/features/admin/hooks/admin-types"

const SCHEDULE_PRESETS = [
  { label: "Every 30 min", value: "*/30 * * * *" },
  { label: "Hourly", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily at midnight", value: "0 0 * * *" },
] as const

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

interface ScheduleDialogProps {
  job: CronJob
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ScheduleDialog({ job, open, onOpenChange }: ScheduleDialogProps) {
  const [schedule, setSchedule] = useState(job.schedule)
  const setScheduleMutation = useSetCronSchedule()
  const { toastError } = useAdminToast()

  useEffect(() => {
    setSchedule(job.schedule)
  }, [job.schedule])

  async function handleSave() {
    try {
      await setScheduleMutation.mutateAsync({ jobName: job.jobname, schedule })
      toast.success("Schedule updated")
      onOpenChange(false)
    } catch (error) {
      toastError(error, "Failed to update schedule.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Schedule</DialogTitle>
          <DialogDescription>
            Update the cron expression for <strong>{job.jobname}</strong>. Uses standard 5-field
            cron syntax.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Cron Expression</Label>
            <Input
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="0 * * * *"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Presets</Label>
            <div className="flex flex-wrap gap-1.5">
              {SCHEDULE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setSchedule(preset.value)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                    schedule === preset.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={setScheduleMutation.isPending || !schedule.trim()}>
            {setScheduleMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface CronJobCardProps {
  job: CronJob
}

function CronJobCard({ job }: CronJobCardProps) {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const toggleJob = useToggleCronJob()
  const { toastError } = useAdminToast()

  async function handleToggle(active: boolean) {
    try {
      await toggleJob.mutateAsync({ jobName: job.jobname, active })
      toast.success(active ? "Job resumed" : "Job paused")
    } catch (error) {
      toastError(error, "Failed to update job.")
    }
  }

  return (
    <>
      <Card className={cn("@container/cron-card border-border/60", !job.active && "opacity-60")}>
        <CardContent className="space-y-3 p-4">
          {/* Identity row: icon + jobname + schedule pill + controls. Controls
              collapse below identity when the card container falls under 420px,
              which is the typical phone-with-admin-shell width. */}
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <CalendarClock className="size-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="break-all font-display text-sm font-medium text-foreground">
                  {job.jobname}
                </h3>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {job.schedule}
                </Badge>
                {!job.active && (
                  <Badge variant="secondary" className="text-[10px]">
                    Paused
                  </Badge>
                )}
              </div>
            </div>
            {/* Wide-container layout — controls inline */}
            <div className="hidden shrink-0 items-center gap-2 @[420px]/cron-card:flex">
              <Button
                variant="ghost"
                size="icon"
                className="size-11 text-muted-foreground hover:text-foreground"
                onClick={() => setScheduleDialogOpen(true)}
                aria-label={`Edit schedule for ${job.jobname}`}
              >
                <Pencil className="size-4" />
              </Button>
              <Switch
                checked={job.active}
                onCheckedChange={handleToggle}
                disabled={toggleJob.isPending}
                aria-label={`${job.active ? "Pause" : "Resume"} ${job.jobname}`}
              />
            </div>
          </div>

          {/* Status row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {job.last_run_status ? (
              <>
                <RunStatusBadge status={job.last_run_status} />
                {job.last_run_start && (
                  <span>
                    <ClientDistanceToNow value={job.last_run_start} addSuffix />
                  </span>
                )}
                {job.last_run_start && job.last_run_end && (
                  <span className="font-mono tabular-nums">
                    {Math.round(
                      (Date.parse(job.last_run_end) - Date.parse(job.last_run_start)) / 1000
                    )}
                    s
                  </span>
                )}
              </>
            ) : (
              <span>Never run</span>
            )}
          </div>

          <p className="truncate font-mono text-[10px] text-muted-foreground/60">{job.command}</p>

          {/* Narrow-container layout — controls below content with min-h-44 */}
          <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-3 @[420px]/cron-card:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px] gap-1.5"
              onClick={() => setScheduleDialogOpen(true)}
              aria-label={`Edit schedule for ${job.jobname}`}
            >
              <Pencil className="size-3.5" />
              <span>Edit schedule</span>
            </Button>
            <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2">
              <Switch
                checked={job.active}
                onCheckedChange={handleToggle}
                disabled={toggleJob.isPending}
                aria-label={`${job.active ? "Pause" : "Resume"} ${job.jobname}`}
              />
              <span className="text-xs text-muted-foreground">
                {job.active ? "Active" : "Paused"}
              </span>
            </label>
          </div>
        </CardContent>
      </Card>
      <ScheduleDialog job={job} open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen} />
    </>
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
  const { data: jobs = [], isLoading: jobsLoading } = useAdminCronJobs()
  const { data: history = [] } = useAdminCronHistory()
  const runDueScrapes = useRunDueScrapes()
  const { toastError } = useAdminToast()
  const [selectedDomain, setSelectedDomain] = useState(ALL_RUNS_DOMAIN)
  const historyGroups = useMemo(() => groupCronRunsByDomain(history), [history])

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
        subtitle="Manage pg_cron jobs and run history"
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

      {/* Job cards */}
      <div className="space-y-3">
        {jobsLoading ? (
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="h-16 animate-pulse bg-muted rounded-lg" />
            </CardContent>
          </Card>
        ) : jobs.length === 0 ? (
          <Card className="border-dashed border-border/60 bg-muted/20">
            <CardContent className="p-8 text-center">
              <CalendarClock className="size-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No cron jobs found</p>
            </CardContent>
          </Card>
        ) : (
          jobs.map((job) => <CronJobCard key={job.jobid} job={job} />)
        )}
      </div>

      {/* Run history */}
      <Card className="border-border/60">
        <CardHeader className="space-y-3 pb-3">
          <CardTitle className="text-sm font-semibold">Recent Runs</CardTitle>
          {historyGroups.length > 1 && (
            <FilterBar>
              <RunDomainChip
                label="All"
                count={history.length}
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
          <RunHistory history={history} selectedDomain={selectedDomain} />
        </CardContent>
      </Card>
    </div>
  )
}
