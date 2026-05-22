import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { qk } from "@/lib/query-keys"
import type { Favorite } from "@/lib/types"
import {
  handleToggleFavoriteOnError,
  handleToggleFavoriteOnMutate,
  handleToggleFavoriteOnSettled,
} from "./use-favorites"

const USER_ID = "user-1"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

describe("useToggleFavorite optimistic lifecycle", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = makeQueryClient()
  })

  it("optimistically flips to favorited and rolls back on error", async () => {
    const baseFavorites: Favorite[] = [
      {
        id: "fav-1",
        user_id: USER_ID,
        event_id: "event-1",
        created_at: "2026-05-10T12:00:00.000Z",
      },
    ]

    queryClient.setQueryData(qk.favorites.byUser(USER_ID), baseFavorites)
    queryClient.setQueryData(
      qk.events.list({
        filters: {},
        userId: USER_ID,
        limit: 100,
        offset: 0,
      }),
      [{ id: "event-2", is_favorited: false }]
    )

    const context = await handleToggleFavoriteOnMutate(queryClient, USER_ID, {
      eventId: "event-2",
      isFavorited: false,
    })

    const optimisticFavorites = queryClient.getQueryData<Favorite[]>(qk.favorites.byUser(USER_ID))
    expect(optimisticFavorites?.some((favorite) => favorite.event_id === "event-2")).toBe(true)

    const optimisticEvents = queryClient.getQueryData<Array<{ id: string; is_favorited: boolean }>>(
      qk.events.list({
        filters: {},
        userId: USER_ID,
        limit: 100,
        offset: 0,
      })
    )
    expect(optimisticEvents?.[0].is_favorited).toBe(true)

    handleToggleFavoriteOnError(
      queryClient,
      USER_ID,
      { eventId: "event-2", isFavorited: false },
      context
    )

    const rolledBackFavorites = queryClient.getQueryData<Favorite[]>(qk.favorites.byUser(USER_ID))
    expect(rolledBackFavorites).toEqual(baseFavorites)

    const rolledBackEvents = queryClient.getQueryData<Array<{ id: string; is_favorited: boolean }>>(
      qk.events.list({
        filters: {},
        userId: USER_ID,
        limit: 100,
        offset: 0,
      })
    )
    expect(rolledBackEvents?.[0].is_favorited).toBe(false)
  })

  it("invalidates only the canonical-source caches when mutation settles", () => {
    const invalidateSpy = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined as never)

    handleToggleFavoriteOnSettled(queryClient, USER_ID, "event-9")

    // Favorites list (small, cheap) and the specific event detail are
    // canonical-source-of-truth refreshes. Broader list caches stay current
    // via the optimistic setQueriesData in onMutate, so invalidating
    // qk.events.all / qk.enrichedEvents.all is intentionally NOT called —
    // refetching every cached city/filter combo on every toggle would double
    // network traffic for no correctness benefit.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: qk.favorites.byUser(USER_ID) })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: qk.events.detailById("event-9") })
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: qk.events.all })
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: qk.enrichedEvents.all })
    expect(invalidateSpy).toHaveBeenCalledTimes(2)
  })
})
