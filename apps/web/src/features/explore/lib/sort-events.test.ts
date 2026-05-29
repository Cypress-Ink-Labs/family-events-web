import { describe, expect, it } from "vitest"
import type { EventWithDetails } from "@/shared/types"
import { sortEvents } from "./sort-events"

function makeEvent(overrides: Partial<EventWithDetails> & { id: string }): EventWithDetails {
  return {
    start_datetime: "2026-06-01T10:00:00.000Z",
    price: null,
    avg_rating: null,
    rating_count: null,
    ...overrides,
  } as EventWithDetails
}

const a = makeEvent({
  id: "a",
  start_datetime: "2026-06-01T10:00:00.000Z",
  price: 20,
  avg_rating: 4,
  rating_count: 10,
})
const b = makeEvent({
  id: "b",
  start_datetime: "2026-06-03T10:00:00.000Z",
  price: 5,
  avg_rating: 5,
  rating_count: 2,
})
const c = makeEvent({
  id: "c",
  start_datetime: "2026-06-02T10:00:00.000Z",
  price: null,
  avg_rating: 5,
  rating_count: 50,
})

const events = [a, b, c]

const ids = (list: EventWithDetails[]) => list.map((e) => e.id)

describe("sortEvents", () => {
  it("soonest sorts by start_datetime ascending", () => {
    expect(ids(sortEvents(events, "soonest"))).toEqual(["a", "c", "b"])
  })

  it("latest sorts by start_datetime descending", () => {
    expect(ids(sortEvents(events, "latest"))).toEqual(["b", "c", "a"])
  })

  it("price-asc sorts cheapest first with null price last", () => {
    expect(ids(sortEvents(events, "price-asc"))).toEqual(["b", "a", "c"])
  })

  it("rating-desc sorts by rating, tie-break by rating_count desc", () => {
    // b and c both rating 5; c has more rating_count -> c before b; a (rating 4) last
    expect(ids(sortEvents(events, "rating-desc"))).toEqual(["c", "b", "a"])
  })

  it("does not mutate the input array", () => {
    const original = [...events]
    sortEvents(events, "latest")
    expect(events).toEqual(original)
  })
})
