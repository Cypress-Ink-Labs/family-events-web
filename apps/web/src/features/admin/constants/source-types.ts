import type { ElementType } from "react"
import { Calendar, FileText, Globe, HelpCircle, MapPin, Rss, Sparkles } from "lucide-react"
import { eventSourceRowSchema } from "@/lib/schemas"

/**
 * Source-type registry for the admin sources screens.
 *
 * Adding a new source type is a single registry entry — and because
 * `ADMIN_SOURCE_TYPE_REGISTRY` is typed as `Record<AdminSourceType, ...>`,
 * the compiler enforces completeness against the contracts enum. Forget
 * an entry → red squiggle in CI.
 */

const ADMIN_SOURCE_TYPES =eventSourceRowSchema.shape.source_type.options
export type AdminSourceType = (typeof ADMIN_SOURCE_TYPES)[number]

interface AdminSourceTypeEntry {
  label: string
  icon: ElementType
}

const ADMIN_SOURCE_TYPE_REGISTRY: Record<AdminSourceType, AdminSourceTypeEntry> = {
  website: { label: "Website", icon: Globe },
  ical: { label: "iCal Feed", icon: Calendar },
  rss: { label: "RSS Feed", icon: Rss },
  manual: { label: "Manual", icon: FileText },
  macaronikid: { label: "Macaroni Kid", icon: Sparkles },
  brec: { label: "BREC", icon: MapPin },
}

/** Back-compat alias maps derived from the registry. New code can read the
 *  registry directly; existing call sites keep working without churn. */
export const ADMIN_SOURCE_TYPE_LABELS: Record<AdminSourceType, string> = Object.fromEntries(
  ADMIN_SOURCE_TYPES.map((type) => [type, ADMIN_SOURCE_TYPE_REGISTRY[type].label])
) as Record<AdminSourceType, string>

const ADMIN_SOURCE_TYPE_ICONS: Record<AdminSourceType, ElementType> = Object.fromEntries(
  ADMIN_SOURCE_TYPES.map((type) => [type, ADMIN_SOURCE_TYPE_REGISTRY[type].icon])
) as Record<AdminSourceType, ElementType>

export const ADMIN_SOURCE_TYPE_OPTIONS = ADMIN_SOURCE_TYPES.map((value) => ({
  value,
  label: ADMIN_SOURCE_TYPE_REGISTRY[value].label,
}))

/** Icon for an unknown source-type string (defensive — should never fire). */
const ADMIN_SOURCE_TYPE_FALLBACK_ICON: ElementType = HelpCircle

export function getAdminSourceIcon(sourceType: string): ElementType {
  return (
    ADMIN_SOURCE_TYPE_REGISTRY[sourceType as AdminSourceType]?.icon ??
    ADMIN_SOURCE_TYPE_FALLBACK_ICON
  )
}
