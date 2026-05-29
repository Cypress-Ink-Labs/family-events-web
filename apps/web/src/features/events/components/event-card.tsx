import { safeImageSrc } from "@/infrastructure/safe-url"
import { getFallbackImageUrl } from "@/features/events/lib/fallback-images"
import type { EventWithDetails } from "@/shared/types"
import { CompactEventCard } from "@/features/events/components/event-card/compact-card"
import { DefaultEventCard } from "@/features/events/components/event-card/default-card"
import { FeaturedEventCard } from "@/features/events/components/event-card/featured-card"
import { ListEventCard } from "@/features/events/components/event-card/list-card"
import type { EventCardVariant } from "@/features/events/components/event-card/_shared"

export { EventCardSkeleton } from "@/features/events/components/event-card/skeleton"

interface EventCardProps {
  event: EventWithDetails
  variant?: EventCardVariant
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
    safeImageSrc(event.images?.[0]) ??
    getFallbackImageUrl(event.id, (event.tags ?? []).map((t) => t.tag.slug), 600, 400)
  const startDate = new Date(event.start_datetime)

  const shared = {
    event,
    imageUrl,
    startDate,
    onFavoriteToggle,
    className,
  }

  if (variant === "compact") return <CompactEventCard {...shared} />
  if (variant === "list") return <ListEventCard {...shared} />
  if (variant === "featured") return <FeaturedEventCard {...shared} />
  return <DefaultEventCard {...shared} />
}
