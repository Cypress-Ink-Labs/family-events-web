import { Link } from "react-router-dom"
import { Calendar, MapPin, Navigation } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ClientDate } from "@/components/client-date"
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
  today: "var(--color-accent-secondary)",
  soon: "var(--color-accent-primary)",
  future: "var(--color-accent-tertiary)",
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
      style={{
        width: size,
        height: size,
        background: "var(--color-accent-primary)",
        color: "var(--color-surface)",
        boxShadow:
          "0 10px 20px -10px oklch(0 0 0 / 0.45), 0 0 0 4px color-mix(in oklch, var(--color-accent-primary) 30%, transparent)",
      }}
      className="rounded-full flex items-center justify-center font-bold text-sm transition-transform hover:scale-110"
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
      <span className="relative block size-3 rounded-full bg-blue-500 ring-2 ring-white shadow" />
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
        className="font-semibold text-sm text-foreground hover:text-accent-primary block leading-tight"
      >
        {event.title}
      </Link>
      {event.venue_name && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="size-3" />
          {event.venue_name}
        </p>
      )}
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Calendar className="size-3" />
        <ClientDate value={event.start_datetime} pattern="MMM d, h:mm a" />
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
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-7 text-xs border-accent-primary bg-accent-primary text-surface hover:bg-accent-primary/90 hover:text-surface focus-visible:border-accent-primary focus-visible:ring-accent-primary/30"
        >
          <Link to={`/events/${event.id}`}>Details</Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 border-accent-tertiary/40 text-accent-tertiary hover:bg-accent-tertiary-soft hover:text-accent-tertiary focus-visible:border-accent-tertiary focus-visible:ring-accent-tertiary/30"
          // External link → open in new tab; rel="noopener" for security.
        >
          <a
            href={directionsUrl(event.latitude, event.longitude, event.venue_name ?? undefined)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Navigation className="size-3" />
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
          ? "border-accent-primary bg-accent-primary-soft shadow-sm"
          : "border-border/60 hover:border-accent-primary/40 hover:bg-surface-raised/50"
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
            <ClientDate value={event.start_datetime} pattern="MMM d, h:mm a" />
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
