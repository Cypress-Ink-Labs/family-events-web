import { CircleCheck as CheckCircle, Circle as XCircle, Clock, Loader2 } from "lucide-react"
import { cn } from "@/shared/utils/format"

type CronStatusKey = "success" | "failed" | "running" | "unknown"

// pg_cron uses 'succeeded'/'failed'/'starting' — map to display values.
export function normalizeCronStatus(status: string | null): CronStatusKey {
  if (!status) return "unknown"
  if (status === "succeeded") return "success"
  if (status === "failed") return "failed"
  if (status === "starting") return "running"
  return "unknown"
}

export const CRON_STATUS_CONFIG = {
  success: { icon: CheckCircle, color: "text-[var(--color-success)]", label: "Succeeded" },
  failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
  running: { icon: Loader2, color: "text-[var(--color-accent-tertiary)]", label: "Running" },
  unknown: { icon: Clock, color: "text-muted-foreground", label: "Unknown" },
} as const

export function RunStatusBadge({ status }: { status: string | null }) {
  const key = normalizeCronStatus(status)
  const cfg = CRON_STATUS_CONFIG[key]
  return (
    <div className={cn("flex items-center gap-1", cfg.color)}>
      <cfg.icon className={cn("size-3.5", key === "running" && "animate-spin")} />
      <span className="text-xs font-medium">{cfg.label}</span>
    </div>
  )
}
