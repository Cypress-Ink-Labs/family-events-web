/**
 * Time-based magic numbers used across the app, centralized so the intent
 * (refresh cadence, freshness window, retry delay) is named at every call site.
 */

const ONE_MINUTE_MS = 60_000
const FIVE_MINUTES_MS = 5 * ONE_MINUTE_MS
const FIFTEEN_MINUTES_MS = 15 * ONE_MINUTE_MS

/** How often to refetch the auth user profile while the session is active. */
export const PROFILE_REFRESH_INTERVAL_MS = FIVE_MINUTES_MS

/**
 * Cron/source run is considered stuck if it has been "running" for longer than
 * this window. Drives the `timed_out` badge in admin-logs.
 */
export const SOURCE_STALE_THRESHOLD_MS = FIFTEEN_MINUTES_MS


/**
 * How often the admin logs page refetches queue/run state. Admin queue
 * tables (event_tag_queue, source_scrape_queue, source_runs) are excluded
 * from the supabase_realtime publication because their write rate (~28k
 * WAL rows / sampling window for event_tag_queue alone) overwhelmed
 * realtime.list_changes for negligible viewer count. Polling is the
 * acceptable trade-off for an ops dashboard.
 */
export const ADMIN_LOGS_POLL_INTERVAL_MS = 10_000
