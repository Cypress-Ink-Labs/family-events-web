import { useRef } from "react"
import type { QueryClient } from "@tanstack/react-query"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import type { Favorite } from "@/shared/types"
import { addFavorite, listFavoritesForUser, removeFavorite } from "@/features/events/api/favorites"
import {
  applyFavoriteStateToEventProjectionCaches,
  buildOptimisticFavorites,
  invalidateFavoriteCanonicalQueries,
} from "@/features/events/lib/event-cache"

export function useFavorites(userId: string | undefined) {
  return useQuery({
    queryKey: qk.favorites.byUser(userId),
    queryFn: async (): Promise<Favorite[]> => {
      if (!userId) return []
      return listFavoritesForUser(userId)
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
  applyFavoriteStateToEventProjectionCaches(queryClient, eventId, !isFavorited)

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
  applyFavoriteStateToEventProjectionCaches(queryClient, variables.eventId, variables.isFavorited)
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
  return invalidateFavoriteCanonicalQueries(queryClient, userId, eventId)
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
          await removeFavorite(userId, eventId)
          return false
        }
        await addFavorite(userId, eventId)
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
    onSuccess: async (_isNowFavorited, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.favorites.byUser(userId) }),
        queryClient.invalidateQueries({ queryKey: qk.events.detailById(variables.eventId) }),
      ])
    },
    onSettled: async (_isNowFavorited, error, variables) => {
      if (error) {
        await handleToggleFavoriteOnSettled(queryClient, userId, variables.eventId)
      }
    },
  })
}
