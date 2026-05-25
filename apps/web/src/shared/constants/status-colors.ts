/**
 * Tailwind status-color tokens shared across status badges and indicators.
 * Keep all status-driven styling routed through these maps so a palette change
 * is one edit, not a grep across feature folders.
 */

export type RunStatus = "success" | "error" | "partial" | "running" | "timed_out"
export type SourceHealthStatus = "pending" | "success" | "error" | "partial"

export const RUN_STATUS_TEXT_CLASS: Record<RunStatus, string> = {
  success: "text-[var(--color-success)]",
  error: "text-destructive",
  partial: "text-amber-500",
  running: "text-[var(--color-accent-tertiary)]",
  timed_out: "text-amber-500",
}

export const SOURCE_HEALTH_TEXT_CLASS: Record<SourceHealthStatus, string> = {
  success: "text-[var(--color-success)]",
  error: "text-destructive",
  partial: "text-amber-500",
  pending: "text-muted-foreground",
}

/**
 * Tone applied to queue-status pills in admin-logs. Each token mixes border,
 * subtle background, and text so the pill reads in both light and dark mode.
 */
export const QUEUE_STATUS_TONE = {
  pending:
    "border-[var(--color-accent-tertiary)]/40 bg-[var(--color-accent-tertiary)]/5 text-[var(--color-accent-tertiary)]",
  processing: "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  retrying: "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  succeeded:
    "border-[var(--color-success)]/40 bg-[var(--color-success)]/5 text-[var(--color-success)]",
  failed: "border-border/60 bg-card text-muted-foreground",
  dead: "border-destructive/40 bg-destructive/5 text-destructive",
} as const
