import { format, isToday } from "date-fns"
import { CalendarDays } from "lucide-react"
import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FadeSwap, StaggerItem, StaggerList } from "@/components/motion"
import { EventCard, EventCardSkeleton } from "@/features/events/components/event-card"
import type { EventWithDetails } from "@/lib/types"

interface SelectedDateEventsCardProps {
  selectedDate: Date
  events: EventWithDetails[]
  isLoading: boolean
  isFavorited: (eventId: string) => boolean
  onFavoriteToggle: (eventId: string, nextState: boolean) => void
}

export function CalendarSelectedDatePanel({
  selectedDate,
  events,
  isLoading,
  isFavorited,
  onFavoriteToggle,
}: SelectedDateEventsCardProps) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground text-sm">
            {isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE")}
          </h3>
          <p className="text-xs text-muted-foreground">{format(selectedDate, "MMMM d, yyyy")}</p>
        </div>
        {events.length > 0 && (
          <Badge variant="secondary" className="text-xs font-semibold">
            {events.length} {events.length === 1 ? "event" : "events"}
          </Badge>
        )}
      </div>

      <FadeSwap
        stateKey={
          isLoading
            ? "calendar-selected-loading"
            : events.length === 0
              ? "calendar-selected-empty"
              : "calendar-selected-content"
        }
      >
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <EventCardSkeleton key={`calendar-skeleton-${index}`} variant="compact" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="size-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Nothing planned</p>
            <p className="text-xs text-muted-foreground mb-4">No events on this day</p>
            <Button variant="outline" size="sm" className="text-xs h-8" asChild>
              <Link to="/explore">Browse events</Link>
            </Button>
          </div>
        ) : (
          <StaggerList className="divide-y divide-border/40">
            {events.map((event) => (
              <StaggerItem key={event.id}>
                <EventCard
                  event={{ ...event, is_favorited: isFavorited(event.id) }}
                  variant="compact"
                  onFavoriteToggle={onFavoriteToggle}
                />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </FadeSwap>
    </div>
  )
}
