import type { ElementType } from "react"
import { Calendar, FileText, Globe, HelpCircle, MapPin, Rss, Sparkles } from "lucide-react"
import { eventSourceRowSchema } from "@/lib/schemas"

/**
 * Source-type constants for the admin sources screens.
 *
 * `ADMIN_SOURCE_TYPES` is derived from the contracts Zod enum so adding a new
 * source type in `@family-events/contracts` immediately surfaces a compile
 * error here — the labels and icons records below must stay exhaustive.
 *
 * PR 6 evolves this into a single registry entry per source type.
 */

export const ADMIN_SOURCE_TYPES = eventSourceRowSchema.shape.source_type.options
export type AdminSourceType = (typeof ADMIN_SOURCE_TYPES)[number]

export const ADMIN_SOURCE_TYPE_LABELS: Record<AdminSourceType, string> = {
  website: "Website",
  ical: "iCal Feed",
  rss: "RSS Feed",
  manual: "Manual",
  macaronikid: "Macaroni Kid",
  brec: "BREC",
}

export const ADMIN_SOURCE_TYPE_ICONS: Record<AdminSourceType, ElementType> = {
  website: Globe,
  rss: Rss,
  ical: Calendar,
  manual: FileText,
  macaronikid: Sparkles,
  brec: MapPin,
}

export const ADMIN_SOURCE_TYPE_OPTIONS = ADMIN_SOURCE_TYPES.map((value) => ({
  value,
  label: ADMIN_SOURCE_TYPE_LABELS[value],
}))

/** Icon for an unknown source-type string (defensive — should never fire). */
export const ADMIN_SOURCE_TYPE_FALLBACK_ICON: ElementType = HelpCircle

export function getAdminSourceIcon(sourceType: string): ElementType {
  return ADMIN_SOURCE_TYPE_ICONS[sourceType as AdminSourceType] ?? ADMIN_SOURCE_TYPE_FALLBACK_ICON
}
