import { CalendarPlus } from "lucide-react"
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
}

export function EventDetailBooking({
  event,
  startDate,
  attendees,
  onDecrement,
  onIncrement,
  isInCalendar,
  onAddToCalendar,
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
              onClick={onDecrement}
              className="flex size-11 items-center justify-center rounded-full border border-border text-base font-bold hover:bg-accent"
            >
              −
            </button>
            <span className="text-sm font-bold w-4 text-center">{attendees}</span>
            <button
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
      <Button
        variant="outline"
        className={cn(
          "w-full h-11 mt-3 gap-2",
          isInCalendar && "border-primary text-primary bg-primary/5"
        )}
        onClick={onAddToCalendar}
      >
        <CalendarPlus className="size-4" />
        {isInCalendar ? "Added to Calendar" : "Add to Calendar"}
      </Button>

      <div className="flex items-center justify-center gap-1.5 mt-3">
        <div className="size-1.5 rounded-full bg-green-500" />
        <span className="text-xs text-muted-foreground">SECURE PARENTING PLATFORM</span>
      </div>
    </div>
  )
}
