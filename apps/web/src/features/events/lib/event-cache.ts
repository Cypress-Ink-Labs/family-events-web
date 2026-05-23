import type { QueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import type { Favorite } from "@/lib/types"

export function applyFavoriteStateToCacheValue<T>(
  value: T,
  eventId: string,
  isFavorited: boolean
): T {
  if (Array.isArray(value)) {
    return value.map((entry) => applyFavoriteStateToCacheValue(entry, eventId, isFavorited)) as T
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    let changed = false
    const nextRecord: Record<string, unknown> = {}

    for (const [key, entry] of Object.entries(record)) {
      const nextEntry = applyFavoriteStateToCacheValue(entry, eventId, isFavorited)
      nextRecord[key] = nextEntry
      if (nextEntry !== entry) {
        changed = true
      }
    }

    if (
      typeof record.id === "string" &&
      record.id === eventId &&
      typeof record.is_favorited === "boolean"
    ) {
      nextRecord.is_favorited = isFavorited
      changed = true
    }

    return (changed ? nextRecord : record) as T
  }

  return value
}

export function applyFavoriteStateToEventProjectionCaches(
  queryClient: QueryClient,
  eventId: string,
  isFavorited: boolean
) {
  const roots = new Set<string>([
    qk.events.detailAll[0],
    qk.events.all[0],
    qk.events.byIdsAll[0],
    qk.enrichedEvents.all[0],
    qk.calendarEvents.all[0],
    qk.saturdayPlan.all[0],
  ])

  queryClient.setQueriesData(
    {
      predicate: (query) => {
        const root = query.queryKey[0]
        return typeof root === "string" && roots.has(root)
      },
    },
    (oldData) => applyFavoriteStateToCacheValue(oldData, eventId, isFavorited)
  )
}

export function invalidateEventProjectionQueries(queryClient: QueryClient, eventId: string) {
  void queryClient.invalidateQueries({ queryKey: qk.events.all })
  void queryClient.invalidateQueries({ queryKey: qk.enrichedEvents.all })
  void queryClient.invalidateQueries({ queryKey: qk.events.detailById(eventId) })
  void queryClient.invalidateQueries({ queryKey: qk.events.byIdsAll })
}

export function invalidateFavoriteCanonicalQueries(
  queryClient: QueryClient,
  userId: string | undefined,
  eventId: string
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.favorites.byUser(userId) }),
    queryClient.invalidateQueries({ queryKey: qk.events.detailById(eventId) }),
  ])
}

export function buildOptimisticFavorites(
  favorites: Favorite[],
  userId: string,
  eventId: string,
  wasFavorited: boolean
): Favorite[] {
  if (wasFavorited) {
    return favorites.filter((favorite) => favorite.event_id !== eventId)
  }

  const alreadyExists = favorites.some((favorite) => favorite.event_id === eventId)
  if (alreadyExists) {
    return favorites
  }

  return [
    {
      id: `optimistic-${eventId}`,
      user_id: userId,
      event_id: eventId,
      created_at: new Date().toISOString(),
    },
    ...favorites,
  ]
}
