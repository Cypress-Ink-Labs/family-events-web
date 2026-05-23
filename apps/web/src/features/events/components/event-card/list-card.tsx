import { Link } from "react-router-dom"
import { Clock, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { SmartImage } from "@/components/motion"
import { AgeRangeBadge, TagBadge } from "@/features/events/components/tag-badge"
import { FavoriteButton } from "@/features/events/components/favorite-button"
import { formatEventDateTime } from "@/shared/utils/dates"
import { cn, formatEventPrice } from "@/lib/utils"
import type { EventCardVariantProps } from "@/features/events/components/event-card/_shared"

export function ListEventCard({
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
        className={cn(
          "overflow-hidden border-border/60 hover:shadow-md transition-shadow",
          className
        )}
      >
        <div className="relative">
          <SmartImage
            src={imageUrl}
            alt={event.title}
            className="w-full h-52 object-cover group-hover:scale-[1.02] transition-transform duration-300"
            placeholderClassName="w-full h-52"
          />
          <FavoriteButton
            eventId={event.id}
            isFavorited={event.is_favorited ?? false}
            onToggle={onFavoriteToggle}
            variant="overlay"
          />
          {event.age_min !== null || event.age_max !== null ? (
            <div className="absolute top-3 left-3">
              <AgeRangeBadge ageMin={event.age_min} ageMax={event.age_max} />
            </div>
          ) : null}
          {topTags.find((t) => t.tag.slug === "outdoor") && (
            <div className="absolute bottom-3 left-3">
              <Badge className="bg-green-600 text-white text-[10px]">
                {topTags.find((t) => t.tag.slug === "outdoor")?.tag.name}
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex gap-2 flex-wrap mb-2">
            {topTags
              .filter((t) => t.tag.slug !== "outdoor")
              .slice(0, 2)
              .map((et) => (
                <TagBadge key={et.tag_id} tag={et.tag} />
              ))}
          </div>
          <h3 className="font-semibold text-base text-foreground leading-tight line-clamp-2">
            {event.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground text-xs">
            <Clock className="size-3" />
            <span>{formatEventDateTime(startDate)}</span>
          </div>
          {event.venue_name && (
            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-xs">
              <MapPin className="size-3" />
              <span className="truncate">{event.venue_name}</span>
            </div>
          )}
          <div className="flex items-center justify-between mt-3">
            <span
              className={cn(
                "text-sm font-bold",
                event.is_free ? "text-green-600 dark:text-green-400" : "text-primary"
              )}
            >
              {formatEventPrice(event.price, event.is_free)}
            </span>
            <span className="text-xs text-muted-foreground">Details →</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
