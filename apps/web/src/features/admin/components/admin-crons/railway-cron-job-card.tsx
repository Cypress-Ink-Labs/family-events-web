import { CalendarClock } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ClientDistanceToNow } from "@/components/client-date"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/shared/utils/format"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import { useToggleRailwayCron } from "@/features/admin/hooks/operations/use-admin-crons"
import type { RailwayCronJob } from "@/features/admin/types"
import { RunStatusBadge } from "@/features/admin/components/admin-crons/run-status-badge"

export function RailwayCronJobCard({ job }: { job: RailwayCronJob }) {
  const label = job.label
    .split("-")
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ")
  const toggleRailway = useToggleRailwayCron()
  const { toastError } = useAdminToast()

  async function handleToggle(enabled: boolean) {
    try {
      await toggleRailway.mutateAsync({ label: job.label, enabled })
      toast.success(enabled ? "Cron enabled" : "Cron paused")
    } catch (error) {
      toastError(error, "Failed to update cron.")
    }
  }

  return (
    <Card className={cn("@container/cron-card border-border/60", !job.enabled && "opacity-60")}>
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
              {!job.enabled && (
                <Badge variant="secondary" className="text-[10px]">
                  Paused
                </Badge>
              )}
            </div>
          </div>
          <div className="hidden shrink-0 items-center gap-2 @[420px]/cron-card:flex">
            <Switch
              checked={job.enabled}
              onCheckedChange={handleToggle}
              disabled={toggleRailway.isPending}
              aria-label={`${job.enabled ? "Pause" : "Resume"} ${job.label}`}
            />
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
        <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-3 @[420px]/cron-card:hidden">
          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2">
            <Switch
              checked={job.enabled}
              onCheckedChange={handleToggle}
              disabled={toggleRailway.isPending}
              aria-label={`${job.enabled ? "Pause" : "Resume"} ${job.label}`}
            />
            <span className="text-xs text-muted-foreground">
              {job.enabled ? "Active" : "Paused"}
            </span>
          </label>
        </div>
      </CardContent>
    </Card>
  )
}
