import { sanitizePostgrestLike } from "@/lib/utils"
import type { Event } from "@/lib/types"

const OPEN_ENDED_MAX_AGE = 99

function normalizeAgeBounds(event: Event) {
  return {
    min: event.age_min ?? 0,
    max: event.age_max ?? OPEN_ENDED_MAX_AGE,
  }
}

export function matchesAgeFilter(event: Event, filterMin?: number, filterMax?: number): boolean {
  if (filterMin === undefined && filterMax === undefined) {
    return true
  }

  const { min, max } = normalizeAgeBounds(event)
  const rangeMin = filterMin ?? 0
  const rangeMax = filterMax ?? OPEN_ENDED_MAX_AGE

  return max >= rangeMin && min <= rangeMax
}

export function normalizeKeyword(value: string): string {
  return sanitizePostgrestLike(value)
}
