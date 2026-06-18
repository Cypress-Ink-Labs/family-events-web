import type { EventWithDetails } from "@/shared/types"
import { resolveEventImageUrl } from "@/features/events/lib/event-card-media"
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
  showImages?: boolean
}

export function EventCard({
  event,
  variant = "default",
  onFavoriteToggle,
  className,
  showImages = true,
}: EventCardProps) {
  const imageUrl = resolveEventImageUrl(event, 600, 400)
  const startDate = new Date(event.start_datetime)

  const shared = {
    event,
    imageUrl,
    startDate,
    onFavoriteToggle,
    className,
    showImages,
  }

  if (variant === "compact") return <CompactEventCard {...shared} />
  if (variant === "list") return <ListEventCard {...shared} />
  if (variant === "featured") return <FeaturedEventCard {...shared} />
  return <DefaultEventCard {...shared} />
}
