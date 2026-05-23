import { Link } from "react-router-dom"
import { Clock, MapPin } from "lucide-react"
import { Card, CardContent } from "@/shared/components/ui/card"
import { SmartImage } from "@/shared/components/motion"
import { AgeRangeBadge, TagBadge } from "@/features/events/components/tag-badge"
import { FavoriteButton } from "@/features/events/components/favorite-button"
import { StarRating } from "@/features/events/components/star-rating"
import { formatEventDayHour } from "@/shared/utils/dates"
import { cn, formatEventPrice } from "@/shared/utils/format"
import type { EventCardVariantProps } from "@/features/events/components/event-card/_shared"

export function DefaultEventCard({
  event,
  imageUrl,
  startDate,
  onFavoriteToggle,
  className,
}: EventCardVariantProps) {
  const topTags = event.tags?.slice(0, 3) || []
  return (
    <Link to={`/events/${event.id}`} className="block group">
      <Card
        className={cn("overflow-hidden border-border/60 hover:shadow-md transition-all", className)}
      >
        <div className="relative">
          <SmartImage
            src={imageUrl}
            alt={event.title}
            className="w-full h-44 object-cover group-hover:scale-[1.02] transition-transform duration-300"
            placeholderClassName="w-full h-44"
          />
          <FavoriteButton
            eventId={event.id}
            isFavorited={event.is_favorited ?? false}
            onToggle={onFavoriteToggle}
            variant="overlay"
            size="sm"
          />
          {(event.age_min !== null || event.age_max !== null) && (
            <div className="absolute top-2 left-2">
              <AgeRangeBadge ageMin={event.age_min} ageMax={event.age_max} />
            </div>
          )}
        </div>
        <CardContent className="p-3">
          <div className="flex gap-1.5 flex-wrap mb-1.5">
            {topTags.slice(0, 2).map((et) => (
              <TagBadge key={et.tag_id} tag={et.tag} />
            ))}
          </div>
          <h3 className="font-semibold text-sm text-foreground leading-snug line-clamp-2">
            {event.title}
          </h3>
          <div className="flex items-center gap-1 mt-1 text-muted-foreground text-xs">
            <Clock className="size-3" />
            <span>{formatEventDayHour(startDate)}</span>
          </div>
          {event.venue_name && (
            <div className="flex items-center gap-1 mt-0.5 text-muted-foreground text-xs">
              <MapPin className="size-3" />
              <span className="truncate">{event.venue_name}</span>
            </div>
          )}
          <div className="flex items-center justify-between mt-2.5">
            <span
              className={cn("text-sm font-bold", event.is_free ? "text-green-600" : "text-primary")}
            >
              {formatEventPrice(event.price, event.is_free)}
            </span>
            {event.avg_rating && event.rating_count ? (
              <div className="flex items-center gap-1">
                <StarRating value={event.avg_rating} readonly size="sm" />
                <span className="text-xs text-muted-foreground">({event.rating_count})</span>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
