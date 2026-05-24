import { format, isSameDay, isThisYear, isToday } from "date-fns"

/**
 * Intent-revealing date formatters used across the app. Centralizing here
 * keeps the actual format strings (`"EEE, MMM d · h:mm a"`, etc.) in one
 * place — call sites read like English instead of date-fns pattern arcana.
 */

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value)
}

function pluralize(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`
}

/** "Sat, May 23 · 2:30 PM" — the canonical event-card line. */
export function formatEventDateTime(value: Date | string | number): string {
  return format(toDate(value), "EEE, MMM d · h:mm a")
}

/** "Sat, May 23" — date only. */
export function formatEventDate(value: Date | string | number): string {
  return format(toDate(value), "EEE, MMM d")
}

/** "May 23 · 2 PM" — compact summary used by featured cards. */
export function formatEventDayHour(value: Date | string | number): string {
  return format(toDate(value), "MMM d · h a")
}

/** "2:30 PM" — time only. */
export function formatEventTime(value: Date | string | number): string {
  return format(toDate(value), "h:mm a")
}

/** "2:30 PM - 4:00 PM" — same-day range, or full date+time on each end. */
export function formatTimeRange(
  start: Date | string | number,
  end: Date | string | number
): string {
  const a = toDate(start)
  const b = toDate(end)
  if (isSameDay(a, b)) {
    return `${format(a, "h:mm a")} - ${format(b, "h:mm a")}`
  }
  return `${formatEventDateTime(a)} - ${formatEventDateTime(b)}`
}

export function formatDurationMinutes(totalMinutes: number | null | undefined): string {
  if (totalMinutes == null || !Number.isFinite(totalMinutes)) return "TBD"

  const minutes = Math.round(totalMinutes)
  if (minutes <= 0) return "TBD"
  if (minutes < 60) return pluralize(minutes, "minute", "minutes")

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  const hoursLabel = pluralize(hours, "hour", "hours")

  if (remainingMinutes === 0) return hoursLabel
  return `${hoursLabel} ${pluralize(remainingMinutes, "minute", "minutes")}`
}

export function formatDurationBetween(
  start: Date | string | number,
  end: Date | string | number | null | undefined
): string {
  if (end == null) return "TBD"

  const startDate = toDate(start)
  const endDate = toDate(end)
  const durationMs = endDate.getTime() - startDate.getTime()

  if (!Number.isFinite(durationMs)) return "TBD"
  return formatDurationMinutes(durationMs / 60000)
}

/**
 * Compact rendering for "last run at" admin tables:
 *  - today → "2:30pm"
 *  - this year → "5/23 2:30pm"
 *  - older → "5/23/24"
 */
export function formatLastRun(value: Date | string | number): string {
  const date = toDate(value)
  if (isToday(date)) return format(date, "h:mma").toLowerCase()
  if (isThisYear(date)) return format(date, "M/d h:mma").toLowerCase()
  return format(date, "M/d/yy")
}
