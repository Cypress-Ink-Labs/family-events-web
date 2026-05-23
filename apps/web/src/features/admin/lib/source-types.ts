import { eventSourceRowSchema } from "@/lib/schemas"

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

export const ADMIN_SOURCE_TYPE_OPTIONS = ADMIN_SOURCE_TYPES.map((value) => ({
  value,
  label: ADMIN_SOURCE_TYPE_LABELS[value],
}))
