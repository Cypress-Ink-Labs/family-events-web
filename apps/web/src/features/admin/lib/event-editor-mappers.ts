import type { Event, EventWithDetails, Json } from "@/shared/types"
import type { AdminEventEditorValues } from "./event-editor-schema"
import { ADMIN_EDITABLE_EVENT_FIELDS, type AdminEditableEventField } from "./event-field-locks"

interface EventPatchFields {
  title: string
  description: string | null
  start_datetime: string | null
  end_datetime: string | null
  timezone: string
  venue_name: string | null
  address: string | null
  city_id: string | null
  latitude: number | null
  longitude: number | null
  age_min: number | null
  age_max: number | null
  price: number | null
  is_free: boolean
  is_outdoor: boolean | null
  source_url: string | null
  source_name: string | null
  source_id: string | null
  images: string[]
  status: Event["status"]
  recurrence_info: Json | null
  is_featured: boolean
}
export type AdminEventPatch = Partial<EventPatchFields>

function assignEventPatchField<Field extends AdminEditableEventField>(
  patch: AdminEventPatch,
  field: Field,
  value: EventPatchFields[Field]
) {
  patch[field] = value
}

function toLocalDateTimeInput(value: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function fromLocalDateTimeInput(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function formatJson(value: Json | null): string {
  if (value === null || value === undefined) return ""
  return JSON.stringify(value, null, 2)
}

function parseJsonText(value: string): Json | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  return JSON.parse(trimmed) as Json
}

function textOrNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function eventToEditorValues(event: EventWithDetails): AdminEventEditorValues {
  return {
    title: event.title,
    description: event.description ?? "",
    start_datetime: toLocalDateTimeInput(event.start_datetime),
    end_datetime: toLocalDateTimeInput(event.end_datetime),
    timezone: event.timezone,
    venue_name: event.venue_name ?? "",
    address: event.address ?? "",
    city_id: event.city_id,
    latitude: event.latitude,
    longitude: event.longitude,
    age_min: event.age_min,
    age_max: event.age_max,
    price: event.price,
    is_free: event.is_free,
    is_outdoor: event.is_outdoor,
    source_url: event.source_url ?? "",
    source_name: event.source_name ?? "",
    source_id: event.source_id,
    imagesText: event.images.join("\n"),
    status: event.status,
    recurrenceInfoText: formatJson(event.recurrence_info),
    is_featured: event.is_featured,
    tagIds: event.tags?.map((tag) => tag.tag_id) ?? [],
  }
}

export function editorValuesToEventPatch(values: AdminEventEditorValues): EventPatchFields {
  const endDatetime = fromLocalDateTimeInput(values.end_datetime)
  return {
    title: values.title.trim(),
    description: textOrNull(values.description),
    start_datetime: fromLocalDateTimeInput(values.start_datetime),
    end_datetime: endDatetime,
    timezone: values.timezone.trim(),
    venue_name: textOrNull(values.venue_name),
    address: textOrNull(values.address),
    city_id: values.city_id,
    latitude: values.latitude,
    longitude: values.longitude,
    age_min: values.age_min,
    age_max: values.age_max,
    price: values.is_free ? null : values.price,
    is_free: values.is_free,
    is_outdoor: values.is_outdoor,
    source_url: textOrNull(values.source_url),
    source_name: textOrNull(values.source_name),
    source_id: values.source_id,
    images: values.imagesText.split("\n").flatMap((value) => {
      const trimmed = value.trim()
      return trimmed ? [trimmed] : []
    }),
    status: values.status,
    recurrence_info: parseJsonText(values.recurrenceInfoText),
    is_featured: values.is_featured,
  }
}

export function changedEventPatch(
  initial: AdminEventEditorValues,
  values: AdminEventEditorValues
): AdminEventPatch {
  const initialPatch = editorValuesToEventPatch(initial)
  const nextPatch = editorValuesToEventPatch(values)
  const changed: AdminEventPatch = {}
  for (const field of ADMIN_EDITABLE_EVENT_FIELDS) {
    if (JSON.stringify(initialPatch[field]) !== JSON.stringify(nextPatch[field])) {
      assignEventPatchField(changed, field, nextPatch[field])
    }
  }
  return changed
}
