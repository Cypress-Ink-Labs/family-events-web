import { CalendarPlus, Download } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { formatEventDate, formatEventTime } from "@/shared/utils/dates"
import { safeHref } from "@/infrastructure/safe-url"
import { cn } from "@/shared/utils/format"
import type { EventWithDetails } from "@/shared/types"

interface EventDetailBookingProps {
  event: EventWithDetails
  startDate: Date
  attendees: number
  onDecrement: () => void
  onIncrement: () => void
  isInCalendar: boolean
  onAddToCalendar: () => void
  onExportCalendar?: () => void
}

export function EventDetailBooking({
  event,
  startDate,
  attendees,
  onDecrement,
  onIncrement,
  isInCalendar,
  onAddToCalendar,
  onExportCalendar,
}: EventDetailBookingProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">Reserve Your Spot</h2>
      <div className="space-y-3 mb-5">
        <div className="flex items-center justify-between py-3 border-b border-border/40">
          <span className="text-sm text-muted-foreground">Date</span>
          <span className="text-sm font-semibold">{formatEventDate(startDate)}</span>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-border/40">
          <span className="text-sm text-muted-foreground">Time</span>
          <span className="text-sm font-semibold">{formatEventTime(startDate)}</span>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-muted-foreground">Attendees</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onDecrement}
              className="flex size-11 items-center justify-center rounded-full border border-border text-base font-bold hover:bg-accent"
            >
              −
            </button>
            <span className="text-sm font-bold w-4 text-center">{attendees}</span>
            <button
              type="button"
              onClick={onIncrement}
              className="flex size-11 items-center justify-center rounded-full border border-border text-base font-bold hover:bg-accent"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <Button className="w-full h-12 text-base font-bold" asChild>
        <a href={safeHref(event.source_url)} target="_blank" rel="noopener noreferrer">
          {event.is_free
            ? "Reserve Your Spot (Free)"
            : event.price != null
              ? `Book Now · $${event.price * attendees}`
              : "Book Now"}
        </a>
      </Button>
      <div className="flex gap-2 mt-3">
        <Button
          variant="outline"
          className={cn(
            "flex-1 h-11 gap-2",
            isInCalendar && "border-primary text-primary bg-primary/5"
          )}
          onClick={onAddToCalendar}
        >
          <CalendarPlus className="size-4" />
          {isInCalendar ? "Saved" : "Save Event"}
        </Button>
        {onExportCalendar && (
          <Button variant="outline" className="h-11 gap-2" onClick={onExportCalendar}>
            <Download className="size-4" />
            Export .ics
          </Button>
        )}
      </div>

      <div className="flex items-center justify-center gap-1.5 mt-3">
        <div className="size-1.5 rounded-full bg-[var(--color-success)]" />
        <span className="text-xs text-muted-foreground">SECURE PARENTING PLATFORM</span>
      </div>
    </div>
  )
}
