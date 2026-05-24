export const ADMIN_EDITABLE_EVENT_FIELDS = [
  "title",
  "description",
  "start_datetime",
  "end_datetime",
  "timezone",
  "venue_name",
  "address",
  "city_id",
  "latitude",
  "longitude",
  "age_min",
  "age_max",
  "price",
  "is_free",
  "is_outdoor",
  "source_url",
  "source_name",
  "source_id",
  "images",
  "status",
  "recurrence_info",
  "is_featured",
] as const

export type AdminEditableEventField = (typeof ADMIN_EDITABLE_EVENT_FIELDS)[number]

const ADMIN_EDITABLE_EVENT_FIELD_SET = new Set<string>(ADMIN_EDITABLE_EVENT_FIELDS)

const EVENT_FIELD_LABELS: Record<AdminEditableEventField, string> = {
  title: "Title",
  description: "Description",
  start_datetime: "Start date",
  end_datetime: "End date",
  timezone: "Timezone",
  venue_name: "Venue",
  address: "Address",
  city_id: "City",
  latitude: "Latitude",
  longitude: "Longitude",
  age_min: "Minimum age",
  age_max: "Maximum age",
  price: "Price",
  is_free: "Free event",
  is_outdoor: "Outdoor",
  source_url: "Source URL",
  source_name: "Source name",
  source_id: "Source",
  images: "Images",
  status: "Status",
  recurrence_info: "Recurrence",
  is_featured: "Featured",
}

export function formatEventFieldLabel(field: string): string {
  return ADMIN_EDITABLE_EVENT_FIELD_SET.has(field)
    ? EVENT_FIELD_LABELS[field as AdminEditableEventField]
    : field
}
