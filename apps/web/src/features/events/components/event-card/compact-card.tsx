import { Link } from "react-router-dom"
import { Button } from "@/shared/components/ui/button"
import { AffordancePillCompact } from "@/shared/components/ui/affordance-pill"
import { SmartImage } from "@/shared/components/motion"
import { AgeRangeBadge } from "@/features/events/components/tag-badge"
import {
  findUnsplashAttribution,
  UnsplashAttribution,
} from "@/features/events/components/unsplash-attribution"
import { formatEventDate } from "@/shared/utils/dates"
import { cn } from "@/shared/utils/format"
import type { EventCardVariantProps } from "@/features/events/components/event-card/_shared"

export function CompactEventCard({ event, imageUrl, startDate, className }: EventCardVariantProps) {
  const attribution = findUnsplashAttribution(event.image_attributions, imageUrl)

  return (
    <Link to={`/events/${event.id}`} className="block">
      <div
        className={cn(
          "flex gap-3 items-center py-3 px-1 border-b border-border last:border-0 hover:bg-accent/30 transition-colors rounded-lg px-2",
          className
        )}
      >
        <div className="size-14 rounded-xl overflow-hidden shrink-0 bg-muted">
          <SmartImage
            src={imageUrl}
            alt={event.title}
            className="size-full object-cover"
            placeholderClassName="size-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatEventDate(startDate)}
            {event.venue_name ? ` · ${event.venue_name}` : ""}
          </p>
          <UnsplashAttribution attribution={attribution} imageUrl={imageUrl} className="mt-1" />
          <div className="flex items-center gap-1.5 mt-1">
            {event.is_free ? (
              <AffordancePillCompact variant="free" />
            ) : event.price != null ? (
              <span className="text-xs font-semibold text-primary">${event.price}</span>
            ) : (
              <span className="text-xs text-muted-foreground">See details</span>
            )}
            <AgeRangeBadge ageMin={event.age_min} ageMax={event.age_max} />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs shrink-0 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          Book Now
        </Button>
      </div>
    </Link>
  )
}
