import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"
import { qk } from "@/infrastructure/queries/query-keys"
import {
  applyFavoriteStateToCacheValue,
  buildOptimisticFavorites,
  invalidateEventProjectionQueries,
} from "./event-cache"
import type { Favorite } from "@/lib/types"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

describe("applyFavoriteStateToCacheValue", () => {
  it("updates nested event objects without touching unrelated ids", () => {
    const input = {
      heroEvent: { id: "event-1", is_favorited: false, title: "Hero" },
      secondaryEvents: [
        { id: "event-2", is_favorited: false, title: "Secondary" },
        { id: "event-3", is_favorited: true, title: "Other" },
      ],
    }

    const output = applyFavoriteStateToCacheValue(input, "event-2", true)

    expect(output.heroEvent.is_favorited).toBe(false)
    expect(output.secondaryEvents[0].is_favorited).toBe(true)
    expect(output.secondaryEvents[1].is_favorited).toBe(true)
  })

  it("does not match non-string ids", () => {
    const input = { id: 123, is_favorited: false, title: "Numeric id" }

    const output = applyFavoriteStateToCacheValue(input, "123", true)

    expect(output.is_favorited).toBe(false)
  })
})

describe("buildOptimisticFavorites", () => {
  it("adds a local favorite row when the event was not already favorited", () => {
    const favorites: Favorite[] = []

    expect(buildOptimisticFavorites(favorites, "user-1", "event-1", false)).toEqual([
      {
        id: "optimistic-event-1",
        user_id: "user-1",
        event_id: "event-1",
        created_at: expect.any(String),
      },
    ])
  })
})

describe("invalidateEventProjectionQueries", () => {
  it("invalidates every cache namespace that can project event summary state", () => {
    const queryClient = makeQueryClient()
    const invalidateSpy = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined as never)

    invalidateEventProjectionQueries(queryClient, "event-1")

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: qk.events.all })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: qk.enrichedEvents.all })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: qk.events.detailById("event-1") })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: qk.events.byIdsAll })
    expect(invalidateSpy).toHaveBeenCalledTimes(4)
  })
})
