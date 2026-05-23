import type { SourceQueueStatus, TagQueueStatus } from "@/shared/types"

/**
 * Labels and ordering for the admin queue dashboards. Sourced from
 * `pages/admin-logs.tsx` so the queue cards stay aligned with the upstream
 * status enum in `@family-events/contracts`.
 */

export const TAG_QUEUE_STATUS_LABELS: Record<TagQueueStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  succeeded: "Succeeded",
  failed: "Legacy Done",
  dead: "Dead-letter",
}

export const SOURCE_QUEUE_STATUS_LABELS: Record<SourceQueueStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  retrying: "Retrying",
  succeeded: "Succeeded",
  dead: "Dead-letter",
}

export const TAG_QUEUE_ORDER: readonly TagQueueStatus[] = [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "dead",
]

export const SOURCE_QUEUE_ORDER: readonly SourceQueueStatus[] = [
  "pending",
  "processing",
  "retrying",
  "succeeded",
  "dead",
]
