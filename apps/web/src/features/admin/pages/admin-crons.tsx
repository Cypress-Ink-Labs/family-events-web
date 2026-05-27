import { useMemo, useState } from "react"
import { Loader2, Play } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { FilterBar, Toolbar } from "@/components/v2"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import {
  useAdminCronHistory,
  useAdminRailwayCronJobs,
  useAdminRailwayCronHistory,
  useRunDueScrapes,
} from "@/features/admin/hooks/operations/use-admin-crons"
import { railwayCronRunToCronRun } from "@/features/admin/types"
import {
  ALL_RUNS_DOMAIN,
  groupCronRunsByDomain,
} from "@/features/admin/components/admin-crons/cron-domain"
import { RailwayCronJobCard } from "@/features/admin/components/admin-crons/railway-cron-job-card"
import { CronRunDetailSheet } from "@/features/admin/components/admin-crons/cron-run-detail-sheet"
import { RunDomainChip, RunHistory } from "@/features/admin/components/admin-crons/run-history"
import { KNOWN_RAILWAY_CRON_LABELS } from "@/features/admin/constants/cron"
import type { RailwayCronJob } from "@/features/admin/types"

// Re-exports kept stable for tests / external imports.
export {
  getCronRunDomain,
  groupCronRunsByDomain,
} from "@/features/admin/components/admin-crons/cron-domain"
import type { CronRun } from "@/features/admin/types"

export function AdminCronsPage() {
  // pg_cron is fully migrated off Supabase — see migration
  // 20260601006600_consolidate_remaining_pg_cron.sql. All cron work runs on
  // Railway; cron.job_run_details is still queried for historical visibility.
  const { data: history = [] } = useAdminCronHistory()
  const { data: railwayJobs = [], isLoading: railwayJobsLoading } = useAdminRailwayCronJobs()
  const { data: railwayHistory = [] } = useAdminRailwayCronHistory()
  const runDueScrapes = useRunDueScrapes()
  const { toastError } = useAdminToast()
  const [selectedDomain, setSelectedDomain] = useState(ALL_RUNS_DOMAIN)
  const [selectedRun, setSelectedRun] = useState<CronRun | null>(null)

  const allJobs = useMemo<RailwayCronJob[]>(() => {
    const byLabel = new Map(railwayJobs.map((j) => [j.label, j]))
    return KNOWN_RAILWAY_CRON_LABELS.map(
      (label) =>
        byLabel.get(label) ?? {
          label,
          enabled: true,
          last_run_status: null,
          last_run_at: null,
          last_run_duration_s: null,
          last_http_status: null,
        }
    )
  }, [railwayJobs])

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

      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services">Railway Services</TabsTrigger>
          <TabsTrigger value="runs">Recent Runs ({combinedHistory.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-4 space-y-3">
          {railwayJobsLoading ? (
            <Card className="border-border/60">
              <CardContent className="p-4">
                <div className="h-16 animate-pulse rounded-lg bg-muted" />
              </CardContent>
            </Card>
          ) : (
            allJobs.map((job) => <RailwayCronJobCard key={job.label} job={job} />)
          )}
        </TabsContent>

        <TabsContent value="runs" className="mt-4">
          <Card className="border-border/60">
            <CardHeader className="space-y-3 pb-3">
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
              <RunHistory
                history={combinedHistory}
                selectedDomain={selectedDomain}
                onRunSelect={setSelectedRun}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CronRunDetailSheet
        run={selectedRun}
        open={selectedRun != null}
        onOpenChange={(open) => {
          if (!open) setSelectedRun(null)
        }}
      />
    </div>
  )
}
