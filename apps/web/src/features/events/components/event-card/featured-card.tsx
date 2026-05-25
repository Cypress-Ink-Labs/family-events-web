import { Link } from "react-router-dom"
import { Card, CardContent } from "@/shared/components/ui/card"
import { SmartImage } from "@/shared/components/motion"
import { FavoriteButton } from "@/features/events/components/favorite-button"
import { StarRating } from "@/features/events/components/star-rating"
import { formatEventDate } from "@/shared/utils/dates"
import { cn } from "@/shared/utils/format"
import type { EventCardVariantProps } from "@/features/events/components/event-card/_shared"

export function FeaturedEventCard({
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
        className={cn("overflow-hidden border-border/60 hover:shadow-lg transition-all", className)}
      >
        <div className="relative">
          <SmartImage
            src={imageUrl}
            alt={event.title}
            className="w-full h-48 object-cover"
            placeholderClassName="w-full h-48"
          />
          <FavoriteButton
            eventId={event.id}
            isFavorited={event.is_favorited ?? false}
            onToggle={onFavoriteToggle}
            variant="overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-10">
            <div className="flex gap-1.5 mb-1.5 flex-wrap">
              {topTags.slice(0, 2).map((et) => (
                <span
                  key={et.tag_id}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-white/20 text-white backdrop-blur-sm"
                >
                  {et.tag.name}
                </span>
              ))}
            </div>
            <p className="text-white font-bold text-sm leading-tight line-clamp-2">{event.title}</p>
            <p className="text-white/80 text-xs mt-0.5">
              {formatEventDate(startDate)}
              {event.venue_name ? ` · ${event.venue_name}` : ""}
            </p>
          </div>
        </div>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-sm font-bold",
                event.is_free ? "text-[var(--color-accent-kid)]" : "text-primary"
              )}
            >
              {event.is_free
                ? "Free"
                : event.price != null
                  ? `$${event.price}/child`
                  : "See details"}
            </span>
            {event.avg_rating && <StarRating value={event.avg_rating} readonly size="sm" />}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
