import type { EventWithDetails } from "@/shared/types"

export type EventCardVariant = "default" | "compact" | "featured" | "list"

export interface EventCardVariantProps {
  event: EventWithDetails
  imageUrl: string
  startDate: Date
  onFavoriteToggle?: (eventId: string, newState: boolean) => void
  className?: string
  /** When false, the card hides its image block (text-dense mode). Defaults to true. */
  showImages?: boolean
}
