import { Link } from "react-router-dom"
import { format } from "date-fns"
import { Calendar, MapPin, Navigation } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { EventWithDetails } from "@/lib/types"
import {
  type DateBucket,
  dateBucket,
  directionsUrl,
  distanceKm,
  formatDistance,
} from "@/features/map/lib/map-helpers"

export type MappedEvent = EventWithDetails & { latitude: number; longitude: number }

// =============================================
// Single-event pin — color + pulse keyed to date urgency.
// =============================================
const PIN_COLORS: Record<DateBucket, string> = {
  today: "oklch(0.62 0.215 12)",
  soon: "oklch(0.54 0.215 12)",
  future: "oklch(0.45 0.04 220)",
}

interface EventPinProps {
  bucket: DateBucket
  highlighted: boolean
}

export function EventPin({ bucket, highlighted }: EventPinProps) {
  const fill = PIN_COLORS[bucket]
  return (
    <span
      className={`relative inline-block ${highlighted ? "scale-125" : ""} transition-transform`}
    >
      {bucket === "today" && (
        <span
          aria-hidden
          className="absolute inset-0 -m-1 rounded-full animate-ping"
          style={{ background: fill, opacity: 0.35 }}
        />
      )}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 28 36"
        width={highlighted ? 32 : 28}
        height={highlighted ? 41 : 36}
        className="relative drop-shadow"
      >
        <path
          d="M14 0C6.27 0 0 6.27 0 14c0 9.94 14 22 14 22S28 23.94 28 14C28 6.27 21.73 0 14 0z"
          fill={fill}
        />
        <circle cx={14} cy={14} r={5.5} fill="white" />
      </svg>
    </span>
  )
}

// =============================================
// Cluster bubble — bigger as count grows.
// =============================================
interface ClusterBubbleProps {
  count: number
}

export function ClusterBubble({ count }: ClusterBubbleProps) {
  const size = count < 10 ? 36 : count < 50 ? 44 : 52
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-lg ring-4 ring-primary/30 transition-transform hover:scale-110"
    >
      {count}
    </div>
  )
}

// =============================================
// User-location dot.
// =============================================
export function UserLocationDot() {
  return (
    <div className="relative">
      <span className="absolute inset-0 -m-2 rounded-full bg-blue-400 animate-ping opacity-40" />
      <span className="relative block h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white shadow" />
    </div>
  )
}

// =============================================
// Map popup — title, when, where, badges, directions, distance.
// =============================================
interface EventPopupProps {
  event: MappedEvent
  userLocation: { latitude: number; longitude: number } | null
}

export function EventPopup({ event, userLocation }: EventPopupProps) {
  const distance = userLocation
    ? distanceKm(userLocation.latitude, userLocation.longitude, event.latitude, event.longitude)
    : null
  return (
    <div className="space-y-1.5 min-w-[220px]">
      <Link
        to={`/events/${event.id}`}
        className="font-semibold text-sm text-foreground hover:text-primary block leading-tight"
      >
        {event.title}
      </Link>
      {event.venue_name && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {event.venue_name}
        </p>
      )}
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        {format(new Date(event.start_datetime), "MMM d, h:mm a")}
      </p>
      {distance !== null && (
        <p className="text-xs text-muted-foreground">{formatDistance(distance)} away</p>
      )}
      <div className="flex gap-1 flex-wrap pt-1">
        {event.is_free && (
          <Badge variant="secondary" className="text-[10px]">
            Free
          </Badge>
        )}
        {event.age_min !== null && event.age_max !== null && (
          <Badge variant="outline" className="text-[10px]">
            Ages {event.age_min}–{event.age_max}
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1 mt-2">
        <Button asChild size="sm" className="h-7 text-xs">
          <Link to={`/events/${event.id}`}>Details</Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          // External link → open in new tab; rel="noopener" for security.
        >
          <a
            href={directionsUrl(event.latitude, event.longitude, event.venue_name ?? undefined)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Navigation className="h-3 w-3" />
            Directions
          </a>
        </Button>
      </div>
    </div>
  )
}

// =============================================
// List-pane row — hover sync target on desktop.
// =============================================
interface EventListItemProps {
  event: MappedEvent
  active: boolean
  userLocation: { latitude: number; longitude: number } | null
  onHover: (id: string | null) => void
  onSelect: (event: MappedEvent) => void
}

export function EventListItem({
  event,
  active,
  userLocation,
  onHover,
  onSelect,
}: EventListItemProps) {
  const bucket = dateBucket(event.start_datetime)
  const distance = userLocation
    ? distanceKm(userLocation.latitude, userLocation.longitude, event.latitude, event.longitude)
    : null
  return (
    <button
      type="button"
      onMouseEnter={() => onHover(event.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(event)}
      className={`w-full text-left rounded-lg border px-3 py-2.5 transition-all ${
        active
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border/60 hover:border-primary/40 hover:bg-muted/50"
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0">
          <EventPin bucket={bucket} highlighted={false} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground leading-tight truncate">
            {event.title}
          </p>
          {event.venue_name && (
            <p className="text-xs text-muted-foreground truncate">{event.venue_name}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {format(new Date(event.start_datetime), "MMM d, h:mm a")}
            {distance !== null && <> · {formatDistance(distance)}</>}
          </p>
          <div className="flex gap-1 flex-wrap mt-1">
            {bucket === "today" && (
              <Badge variant="secondary" className="text-[10px]">
                Today
              </Badge>
            )}
            {event.is_free && (
              <Badge variant="secondary" className="text-[10px]">
                Free
              </Badge>
            )}
            {event.age_min !== null && event.age_max !== null && (
              <Badge variant="outline" className="text-[10px]">
                Ages {event.age_min}–{event.age_max}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
