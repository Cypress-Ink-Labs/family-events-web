import { MapPin } from "lucide-react"
import { EventMapMini } from "@/features/events/components/event-map-mini"
import type { EventWithDetails } from "@/shared/types"

export function EventDetailLocation({ event }: { event: EventWithDetails }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-3">Location</h2>
      <div className="flex items-start gap-3 mb-3">
        <MapPin className="size-4 text-primary mt-0.5 shrink-0" />
        <div>
          {event.venue_name && (
            <p className="text-sm font-semibold text-foreground">{event.venue_name}</p>
          )}
          {event.address && event.address !== event.venue_name && (
            <p className="text-sm text-muted-foreground">{event.address}</p>
          )}
        </div>
      </div>
      <EventMapMini
        latitude={event.latitude}
        longitude={event.longitude}
        venueName={event.venue_name}
        address={event.address}
        startDatetime={event.start_datetime}
      />
    </div>
  )
}
