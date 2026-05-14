import { Link } from "react-router-dom"
import { MapPin, Clock } from "lucide-react"
import { format } from "date-fns"
import { safeImageSrc } from "@/lib/safe-url"
import { cn, formatEventPrice } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TagBadge, AgeRangeBadge } from "@/features/events/components/tag-badge"
import { FavoriteButton } from "@/features/events/components/favorite-button"
import { SmartImage } from "@/components/motion"
import { StarRating } from "@/features/events/components/star-rating"
import type { EventWithDetails } from "@/lib/types"

interface EventCardProps {
  event: EventWithDetails
  variant?: "default" | "compact" | "featured" | "list"
  onFavoriteToggle?: (eventId: string, newState: boolean) => void
  className?: string
}

export function EventCard({
  event,
  variant = "default",
  onFavoriteToggle,
  className,
}: EventCardProps) {
  const imageUrl =
    safeImageSrc(event.images?.[0]) ?? `https://picsum.photos/seed/${event.id}/600/400`
  const startDate = new Date(event.start_datetime)
  const topTags = event.tags?.slice(0, 3) || []

  if (variant === "compact") {
    return (
      <Link to={`/events/${event.id}`} className="block">
        <div
          className={cn(
            "flex gap-3 items-center py-3 px-1 border-b border-border last:border-0 hover:bg-accent/30 transition-colors rounded-lg px-2",
            className
          )}
        >
          <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 bg-muted">
            <SmartImage
              src={imageUrl}
              alt={event.title}
              className="h-full w-full object-cover"
              placeholderClassName="h-full w-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(startDate, "EEE, MMM d")}
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

  if (variant === "list") {
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
            <h3 className="font-bold text-base text-foreground leading-tight line-clamp-2">
              {event.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground text-xs">
              <Clock className="h-3 w-3" />
              <span>{format(startDate, "EEE, MMM d · h:mm a")}</span>
            </div>
            {event.venue_name && (
              <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-xs">
                <MapPin className="h-3 w-3" />
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

  if (variant === "featured") {
    return (
      <Link to={`/events/${event.id}`} className="block group">
        <Card
          className={cn(
            "overflow-hidden border-border/60 hover:shadow-lg transition-all",
            className
          )}
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
              <p className="text-white font-bold text-sm leading-tight line-clamp-2">
                {event.title}
              </p>
              <p className="text-white/80 text-xs mt-0.5">
                {format(startDate, "EEE, MMM d")}
                {event.venue_name ? ` · ${event.venue_name}` : ""}
              </p>
            </div>
          </div>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-sm font-bold",
                  event.is_free ? "text-green-600 dark:text-green-400" : "text-primary"
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
          <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-2">
            {event.title}
          </h3>
          <div className="flex items-center gap-1 mt-1 text-muted-foreground text-xs">
            <Clock className="h-3 w-3" />
            <span>{format(startDate, "MMM d · h a")}</span>
          </div>
          {event.venue_name && (
            <div className="flex items-center gap-1 mt-0.5 text-muted-foreground text-xs">
              <MapPin className="h-3 w-3" />
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

export function EventCardSkeleton({
  variant = "default",
}: {
  variant?: "default" | "compact" | "list"
}) {
  if (variant === "compact") {
    return (
      <div className="flex gap-3 items-center py-3">
        <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-4 w-3/4 mb-1.5" />
          <Skeleton className="h-3 w-1/2 mb-1.5" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    )
  }

  return (
    <Card className="overflow-hidden">
      <Skeleton className={variant === "list" ? "w-full h-52" : "w-full h-44"} />
      <CardContent className="p-3">
        <Skeleton className="h-3 w-1/2 mb-2" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/3" />
      </CardContent>
    </Card>
  )
}
