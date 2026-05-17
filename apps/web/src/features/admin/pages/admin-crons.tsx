import { useEffect, useMemo, useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { Toolbar } from "@/components/v2"
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
      <Card className={cn("border-border/60", !job.active && "opacity-60")}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="size-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <CalendarClock className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm text-foreground">{job.jobname}</h3>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {job.schedule}
                </Badge>
                {!job.active && (
                  <Badge variant="secondary" className="text-[10px]">
                    Paused
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {job.last_run_status ? (
                  <>
                    <RunStatusBadge status={job.last_run_status} />
                    {job.last_run_start && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(job.last_run_start), { addSuffix: true })}
                      </span>
                    )}
                    {job.last_run_start && job.last_run_end && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(
                          (new Date(job.last_run_end).getTime() -
                            new Date(job.last_run_start).getTime()) /
                            1000
                        )}
                        s
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Never run</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground/60 font-mono mt-2 truncate">
                {job.command}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
                onClick={() => setScheduleDialogOpen(true)}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Switch
                checked={job.active}
                onCheckedChange={handleToggle}
                disabled={toggleJob.isPending}
                aria-label={`${job.active ? "Pause" : "Resume"} ${job.jobname}`}
              />
            </div>
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
        {format(new Date(run.start_time), "MMM d, h:mm:ss a")}
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
        <CardHeader className="pb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-semibold">Recent Runs</CardTitle>
          {historyGroups.length > 1 && (
            <Tabs value={selectedDomain} onValueChange={setSelectedDomain}>
              <TabsList className="h-8 max-w-full overflow-x-auto">
                <TabsTrigger value={ALL_RUNS_DOMAIN} className="text-xs">
                  All
                  <Badge variant="secondary" className="ml-1 text-[10px]">
                    {history.length}
                  </Badge>
                </TabsTrigger>
                {historyGroups.map((group) => (
                  <TabsTrigger key={group.key} value={group.key} className="text-xs">
                    {group.label}
                    <Badge variant="secondary" className="ml-1 text-[10px]">
                      {group.runs.length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <RunHistory history={history} selectedDomain={selectedDomain} />
        </CardContent>
      </Card>
    </div>
  )
}
