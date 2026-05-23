import type { ElementType } from "react"
import {
  Circle as XCircle,
  CircleCheck as CheckCircle,
  Clock,
  TriangleAlert as AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SOURCE_HEALTH_TEXT_CLASS, type SourceHealthStatus } from "@/shared/constants/status-colors"

const SOURCE_HEALTH_VALUES: SourceHealthStatus[] = ["pending", "success", "error", "partial"]

/** Coerce a raw `event_sources.last_status` value into the known enum, defaulting to pending. */
export function getSourceHealthStatus(lastStatus: string | null | undefined): SourceHealthStatus {
  if (lastStatus && SOURCE_HEALTH_VALUES.includes(lastStatus as SourceHealthStatus)) {
    return lastStatus as SourceHealthStatus
  }
  return "pending"
}

const SOURCE_HEALTH_BADGE: Record<SourceHealthStatus, { icon: ElementType; label: string }> = {
  success: { icon: CheckCircle, label: "Healthy" },
  error: { icon: XCircle, label: "Error" },
  partial: { icon: AlertTriangle, label: "Partial" },
  pending: { icon: Clock, label: "Pending" },
}

/** Compact icon + label rendering for a source's current health. */
export function SourceStatusIndicator({ status }: { status: SourceHealthStatus }) {
  const config = SOURCE_HEALTH_BADGE[status]
  return (
    <div className={cn("inline-flex items-center gap-1", SOURCE_HEALTH_TEXT_CLASS[status])}>
      <config.icon className="size-3.5" />
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  )
}
