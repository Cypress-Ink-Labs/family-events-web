import type { Event } from "@/shared/types"

/**
 * Display config (Tailwind classes + label) for each event status. Lives in
 * the admin domain because only admin screens render status badges; the
 * single source of truth for the status enum stays in
 * `features/events/constants/status.ts`.
 */
export const ADMIN_EVENT_STATUS_DISPLAY: Record<Event["status"], { label: string; color: string }> =
  {
    draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
    published: {
      label: "Published",
      color: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
    },
    rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive" },
    archived: { label: "Archived", color: "bg-muted/50 text-muted-foreground" },
  }
