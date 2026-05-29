import type { EventWithDetails } from "@/shared/types"
import { sortByStartDatetime } from "@/shared/utils/dates"
import type { ExploreSortOption } from "@/features/explore/constants/view"

/**
 * Sort explore events by the user's chosen order. Non-mutating: always returns
 * a new array (matching `sortByStartDatetime`'s contract).
 */
export function sortEvents(
  events: EventWithDetails[],
  sort: ExploreSortOption
): EventWithDetails[] {
  switch (sort) {
    case "soonest":
      return sortByStartDatetime(events, "asc")
    case "latest":
      return sortByStartDatetime(events, "desc")
    case "price-asc":
      return [...events].sort((a, b) => {
        const ap = a.price ?? Number.POSITIVE_INFINITY
        const bp = b.price ?? Number.POSITIVE_INFINITY
        return ap - bp
      })
    case "rating-desc":
      return [...events].sort((a, b) => {
        const ratingDiff = (b.avg_rating ?? 0) - (a.avg_rating ?? 0)
        if (ratingDiff !== 0) return ratingDiff
        const countDiff = (b.rating_count ?? 0) - (a.rating_count ?? 0)
        if (countDiff !== 0) return countDiff
        return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
      })
    default:
      return sortByStartDatetime(events, "asc")
  }
}
