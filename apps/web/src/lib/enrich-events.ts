import { supabase } from "@/lib/supabase"
import type { City, Event, EventTag, EventWithDetails, Tag } from "@/lib/types"

interface EventTagWithTag extends EventTag {
  tag: Tag | null
}

interface RatingStatsRow {
  event_id: string
  avg_score: number | null
  rating_count: number | null
}

interface EnrichOptions {
  userId?: string
  includeRatings?: boolean
  includeUserState?: boolean
}

export async function enrichEvents(
  events: Event[],
  options: EnrichOptions = {}
): Promise<EventWithDetails[]> {
  if (events.length === 0) {
    return []
  }

  const { userId, includeRatings = true, includeUserState = true } = options
  const eventIds = events.map((event) => event.id)
  const cityIds = [...new Set(events.map((event) => event.city_id).filter(Boolean))] as string[]

  const tagsPromise = supabase
    .from("event_tags")
    .select("event_id, tag_id, confidence, is_manual_override, created_at, tag:tags(*)")
    .in("event_id", eventIds)

  const cityPromise =
    cityIds.length > 0
      ? supabase.from("cities").select("*").in("id", cityIds)
      : Promise.resolve({ data: [] as City[], error: null })

  const ratingsPromise = includeRatings
    ? supabase
        .from("event_rating_stats")
        .select("event_id, avg_score, rating_count")
        .in("event_id", eventIds)
    : Promise.resolve({ data: [] as RatingStatsRow[], error: null })

  const favoritesPromise =
    includeUserState && userId
      ? supabase.from("favorites").select("event_id").eq("user_id", userId).in("event_id", eventIds)
      : Promise.resolve({ data: [] as Array<{ event_id: string }>, error: null })

  const calendarPromise =
    includeUserState && userId
      ? supabase
          .from("user_calendar_events")
          .select("event_id")
          .eq("user_id", userId)
          .in("event_id", eventIds)
      : Promise.resolve({ data: [] as Array<{ event_id: string }>, error: null })

  const [
    { data: tagRowsRaw, error: tagError },
    { data: cityRows, error: cityError },
    { data: ratingStatsRows, error: ratingError },
    { data: favoriteRows, error: favoriteError },
    { data: calendarRows, error: calendarError },
  ] = await Promise.all([
    tagsPromise,
    cityPromise,
    ratingsPromise,
    favoritesPromise,
    calendarPromise,
  ])

  if (tagError) throw tagError
  if (cityError) throw cityError
  if (ratingError) throw ratingError
  if (favoriteError) throw favoriteError
  if (calendarError) throw calendarError

  const cityMap = new Map<string, City>()
  for (const city of (cityRows ?? []) as City[]) {
    cityMap.set(city.id, city)
  }

  const tagsByEvent = new Map<string, Array<EventTag & { tag: Tag }>>()
  for (const row of (tagRowsRaw ?? []) as EventTagWithTag[]) {
    if (!row.tag) continue

    const current = tagsByEvent.get(row.event_id) ?? []
    current.push({
      event_id: row.event_id,
      tag_id: row.tag_id,
      confidence: row.confidence,
      is_manual_override: row.is_manual_override,
      created_at: row.created_at,
      tag: row.tag,
    })
    tagsByEvent.set(row.event_id, current)
  }

  const ratingStatsByEvent = new Map<string, RatingStatsRow>()
  for (const row of (ratingStatsRows ?? []) as RatingStatsRow[]) {
    ratingStatsByEvent.set(row.event_id, row)
  }

  const favoriteEventIds = new Set((favoriteRows ?? []).map((row) => row.event_id))
  const calendarEventIds = new Set((calendarRows ?? []).map((row) => row.event_id))

  return events.map((event) => {
    const stats = ratingStatsByEvent.get(event.id)
    return {
      ...event,
      city: event.city_id ? (cityMap.get(event.city_id) ?? null) : null,
      tags: tagsByEvent.get(event.id) ?? [],
      avg_rating: stats?.avg_score != null ? Number(stats.avg_score) : undefined,
      rating_count: stats?.rating_count ?? undefined,
      is_favorited: favoriteEventIds.has(event.id),
      is_in_calendar: calendarEventIds.has(event.id),
    }
  })
}
