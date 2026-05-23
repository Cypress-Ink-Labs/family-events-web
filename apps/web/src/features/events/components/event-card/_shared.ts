import type { EventWithDetails } from "@/lib/types"

export type EventCardVariant = "default" | "compact" | "featured" | "list"

export interface EventCardVariantProps {
  event: EventWithDetails
  imageUrl: string
  startDate: Date
  onFavoriteToggle?: (eventId: string, newState: boolean) => void
  className?: string
}
