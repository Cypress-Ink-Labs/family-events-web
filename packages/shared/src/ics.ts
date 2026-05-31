/**
 * RFC 5545 iCalendar (.ics) generator for single-event export.
 *
 * Produces a VCALENDAR with one VEVENT suitable for import into
 * Google Calendar, Apple Calendar, and Outlook.
 */

export interface IcsEventOptions {
  /** Unique identifier (typically the event UUID). */
  uid: string
  /** Event title. */
  title: string
  /** ISO 8601 start datetime. */
  startDatetime: string
  /** ISO 8601 end datetime. Defaults to start + 1 hour if omitted. */
  endDatetime?: string | null
  /** Venue / address. Omitted from output when empty. */
  location?: string | null
  /** Plain-text description. */
  description?: string | null
  /** Canonical URL for the event. */
  url?: string | null
}

const DEFAULT_DURATION_MS = 60 * 60 * 1000 // 1 hour

/**
 * Build a VCALENDAR string containing one VEVENT.
 *
 * Dates are emitted as UTC (`YYYYMMDDTHHMMSSZ`) — the simplest format
 * and universally supported by all calendar clients.
 */
export function buildIcsEvent(options: IcsEventOptions): string {
  const start = new Date(options.startDatetime)
  const end = options.endDatetime
    ? new Date(options.endDatetime)
    : new Date(start.getTime() + DEFAULT_DURATION_MS)

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Family Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${options.uid}@family-events`,
    `DTSTAMP:${formatUtcDate(new Date())}`,
    `DTSTART:${formatUtcDate(start)}`,
    `DTEND:${formatUtcDate(end)}`,
    `SUMMARY:${escapeIcsText(options.title)}`,
  ]

  if (options.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(options.description)}`)
  }
  if (options.location) {
    lines.push(`LOCATION:${escapeIcsText(options.location)}`)
  }
  if (options.url) {
    lines.push(`URL:${options.url}`)
  }

  lines.push("END:VEVENT", "END:VCALENDAR")

  return lines.map(foldLine).join("\r\n") + "\r\n"
}

/**
 * Format a Date as UTC iCalendar datetime: `YYYYMMDDTHHMMSSZ`.
 */
function formatUtcDate(date: Date): string {
  const y = date.getUTCFullYear()
  const m = pad2(date.getUTCMonth() + 1)
  const d = pad2(date.getUTCDate())
  const h = pad2(date.getUTCHours())
  const min = pad2(date.getUTCMinutes())
  const s = pad2(date.getUTCSeconds())
  return `${y}${m}${d}T${h}${min}${s}Z`
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

/**
 * Escape special characters in iCalendar text values per RFC 5545 §3.3.11.
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n")
}

/**
 * Fold content lines longer than 75 octets per RFC 5545 §3.1.
 * Continuation lines start with a single space.
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line
  const parts: string[] = []
  parts.push(line.slice(0, 75))
  let offset = 75
  while (offset < line.length) {
    // Continuation lines have 74 chars of content (75 - leading space)
    parts.push(` ${line.slice(offset, offset + 74)}`)
    offset += 74
  }
  return parts.join("\r\n")
}
