import { useCallback } from "react"
import { buildIcsEvent } from "@family-events/shared"

interface CalendarExportOptions {
  eventId: string
  title: string
  startDatetime: string
  endDatetime?: string | null
  venueName?: string | null
  description?: string | null
}

/**
 * Export an event as an .ics file download.
 *
 * Creates a Blob from the generated iCalendar content and triggers
 * a browser download. Works without authentication.
 */
export function useCalendarExport({
  eventId,
  title,
  startDatetime,
  endDatetime,
  venueName,
  description,
}: CalendarExportOptions) {
  const exportToCalendar = useCallback(() => {
    const icsContent = buildIcsEvent({
      uid: eventId,
      title,
      startDatetime,
      endDatetime,
      location: venueName,
      description,
      url: `${window.location.origin}/events/${eventId}`,
    })

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${slugify(title)}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [eventId, title, startDatetime, endDatetime, venueName, description])

  return { exportToCalendar }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50)
}
