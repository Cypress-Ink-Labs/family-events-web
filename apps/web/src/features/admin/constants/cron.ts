export const ADMIN_CRON_REFETCH_INTERVAL_MS = 30_000
export const ADMIN_CRON_HISTORY_LIMIT = 50

export const ADMIN_CRON_RPCS = {
  listCronJobs: "admin_list_cron_jobs",
  cronRunHistory: "admin_cron_run_history",
  toggleCronJob: "admin_toggle_cron_job",
  setCronSchedule: "admin_set_cron_schedule",
  listRailwayCronJobs: "admin_list_railway_cron_jobs",
  railwayCronRunHistory: "admin_railway_cron_run_history",
  railwayCronRunDetail: "admin_railway_cron_run_detail",
  setRailwayCronEnabled: "admin_set_cron_enabled",
  runDueScrapes: "admin_run_due_scrapes",
} as const

export const ADMIN_CRON_FUNCTIONS = {
  runRailwayCron: "admin-run-cron",
} as const

/** All cron labels supported by the admin-run-cron edge function. */
export const KNOWN_RAILWAY_CRON_LABELS = [
  "cron-cleanup-stale",
  "cron-db-maintenance",
  "cron-enrich-events",
  "cron-review-events",
  "cron-scrape-sources",
  "cron-tag-queue",
] as const
