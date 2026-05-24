import type { EventStatus } from "@/shared/types"

/**
 * Single source of truth for event-status enum values + their human labels.
 * Powers the admin edit form's status select; keeping it as a typed array
 * stops new statuses from drifting between code and UI.
 */

export const EVENT_STATUS_OPTIONS: readonly { value: EventStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
]
