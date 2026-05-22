export const ADMIN_CRON_REFETCH_INTERVAL_MS = 30_000
export const ADMIN_CRON_HISTORY_LIMIT = 50

export const ADMIN_CRON_RPCS = {
  listCronJobs: "admin_list_cron_jobs",
  cronRunHistory: "admin_cron_run_history",
  toggleCronJob: "admin_toggle_cron_job",
  setCronSchedule: "admin_set_cron_schedule",
  listRailwayCronJobs: "admin_list_railway_cron_jobs",
  railwayCronRunHistory: "admin_railway_cron_run_history",
  setRailwayCronEnabled: "admin_set_cron_enabled",
  runDueScrapes: "admin_run_due_scrapes",
} as const
