import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SmartImage } from "@/components/motion"
import { AgeRangeBadge } from "@/features/events/components/tag-badge"
import { formatEventDate } from "@/shared/utils/dates"
import { cn } from "@/lib/utils"
import type { EventCardVariantProps } from "@/features/events/components/event-card/_shared"

export function CompactEventCard({ event, imageUrl, startDate, className }: EventCardVariantProps) {
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
          <div className="flex items-center gap-1.5 mt-1">
            {event.is_free ? (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              >
                Free
              </Badge>
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
