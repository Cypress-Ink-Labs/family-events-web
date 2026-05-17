import { useRef } from "react"
import type { QueryClient } from "@tanstack/react-query"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { supabase } from "@/lib/supabase"
import type { Favorite } from "@/lib/types"

export function useFavorites(userId: string | undefined) {
  return useQuery({
    queryKey: qk.favorites.byUser(userId),
    queryFn: async (): Promise<Favorite[]> => {
      if (!userId) {
        return []
      }

      const { data, error } = await supabase
        .from("favorites")
        .select("id, user_id, event_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      return data ?? []
    },
    enabled: Boolean(userId),
  })
}

interface ToggleFavoriteInput {
  eventId: string
  isFavorited: boolean
}

interface ToggleFavoriteMutationContext {
  previousFavorites: Favorite[]
}

function buildOptimisticFavorites(
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

    if (record.id === eventId && typeof record.is_favorited === "boolean") {
      nextRecord.is_favorited = isFavorited
      changed = true
    }

    return (changed ? nextRecord : record) as T
  }

  return value
}

function updateEventLikeCaches(queryClient: QueryClient, eventId: string, isFavorited: boolean) {
  const roots = new Set([
    "event",
    "events",
    "events-by-id",
    "events-enriched",
    "calendar-events",
    "saturday-plan",
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

export async function handleToggleFavoriteOnMutate(
  queryClient: QueryClient,
  userId: string,
  variables: ToggleFavoriteInput
): Promise<ToggleFavoriteMutationContext> {
  const { eventId, isFavorited } = variables

  await queryClient.cancelQueries({ queryKey: qk.favorites.byUser(userId) })
  const previousFavorites = queryClient.getQueryData<Favorite[]>(qk.favorites.byUser(userId)) ?? []
  const optimisticFavorites = buildOptimisticFavorites(
    previousFavorites,
    userId,
    eventId,
    isFavorited
  )

  queryClient.setQueryData(qk.favorites.byUser(userId), optimisticFavorites)
  updateEventLikeCaches(queryClient, eventId, !isFavorited)

  return { previousFavorites }
}

export function handleToggleFavoriteOnError(
  queryClient: QueryClient,
  userId: string,
  variables: ToggleFavoriteInput,
  context: ToggleFavoriteMutationContext | undefined
) {
  const previousFavorites =
    context?.previousFavorites ??
    queryClient.getQueryData<Favorite[]>(qk.favorites.byUser(userId)) ??
    []
  queryClient.setQueryData(qk.favorites.byUser(userId), previousFavorites)
  updateEventLikeCaches(queryClient, variables.eventId, variables.isFavorited)
}

export function handleToggleFavoriteOnSettled(
  queryClient: QueryClient,
  userId: string | undefined,
  eventId: string
) {
  // Only invalidate caches where the server is the canonical source of truth
  // for this specific event. The optimistic setQueriesData in onMutate
  // already kept the broader event-list caches (qk.events.all,
  // qk.enrichedEvents.all) in sync, so invalidating those roots on every
  // toggle would refetch every cached city/filter combination — doubling
  // network traffic for no correctness benefit.
  void queryClient.invalidateQueries({ queryKey: qk.favorites.byUser(userId) })
  void queryClient.invalidateQueries({ queryKey: qk.events.detailById(eventId) })
}

export function useToggleFavorite(userId: string | undefined) {
  const queryClient = useQueryClient()
  const inFlightEventIdsRef = useRef<Set<string>>(new Set())

  return useMutation({
    mutationFn: async ({ eventId, isFavorited }: ToggleFavoriteInput) => {
      if (!userId) {
        throw new Error("You must be signed in to favorite events.")
      }

      // Guard rapid double-taps so a second click cannot create duplicate writes for one event.
      if (inFlightEventIdsRef.current.has(eventId)) {
        return !isFavorited
      }

      inFlightEventIdsRef.current.add(eventId)

      try {
        if (isFavorited) {
          const { error } = await supabase
            .from("favorites")
            .delete()
            .eq("user_id", userId)
            .eq("event_id", eventId)
          if (error) {
            throw error
          }
          return false
        }

        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: userId, event_id: eventId })
        if (error) {
          throw error
        }
        return true
      } finally {
        inFlightEventIdsRef.current.delete(eventId)
      }
    },
    onMutate: async (variables) => {
      if (!userId) {
        return { previousFavorites: [] }
      }
      // Do NOT touch inFlightEventIdsRef here. It is owned exclusively by
      // mutationFn (which runs immediately after onMutate). If onMutate also
      // wrote to the ref, mutationFn's guard would fire on every first call
      // and skip the network mutation entirely, making favorites unwritable.
      return handleToggleFavoriteOnMutate(queryClient, userId, variables)
    },
    onError: (_error, variables, context) => {
      if (!userId) {
        return
      }
      handleToggleFavoriteOnError(queryClient, userId, variables, context)
    },
    onSuccess: (_isNowFavorited, variables) => {
      handleToggleFavoriteOnSettled(queryClient, userId, variables.eventId)
    },
    onSettled: (_isNowFavorited, error, variables) => {
      if (error) {
        handleToggleFavoriteOnSettled(queryClient, userId, variables.eventId)
      }
    },
  })
}
