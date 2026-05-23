import { enrichEvents } from "@/lib/events/enrich-events"
import type { Event, EventWithDetails } from "@/lib/types"

export async function enrichAdminEvents(events: Event[]): Promise<EventWithDetails[]> {
  return enrichEvents(events, { includeRatings: false, includeUserState: false })
}
