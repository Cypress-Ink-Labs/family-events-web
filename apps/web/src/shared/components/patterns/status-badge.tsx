import type { ElementType } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  RUN_STATUS_TEXT_CLASS,
  SOURCE_HEALTH_TEXT_CLASS,
  type RunStatus,
  type SourceHealthStatus,
} from "@/shared/constants/status-colors"

/**
 * Status pill driven by the shared color tokens. Pass `tone` to pick a color
 * map (`run` for source-run statuses, `source` for source-health). The icon
 * is optional — supplying one keeps the badge consistent with admin tables.
 */

type Tone = "run" | "source"

const TONE_TEXT_CLASS: Record<Tone, (status: string) => string | undefined> = {
  run: (status) => RUN_STATUS_TEXT_CLASS[status as RunStatus],
  source: (status) => SOURCE_HEALTH_TEXT_CLASS[status as SourceHealthStatus],
}

interface StatusBadgeProps {
  tone: Tone
  status: string
  label: string
  icon?: ElementType
  className?: string
}

export function StatusBadge({ tone, status, label, icon: Icon, className }: StatusBadgeProps) {
  const textClass = TONE_TEXT_CLASS[tone](status)
  return (
    <Badge variant="outline" className={cn("gap-1 text-xs font-medium", textClass, className)}>
      {Icon ? <Icon className="size-3.5" /> : null}
      {label}
    </Badge>
  )
}
