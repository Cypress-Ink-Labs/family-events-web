import { describe, expect, it } from "vitest"
import type { EventWithDetails } from "@/shared/types"
import { groupEventsByDay } from "./calendar-view"

function makeEvent(id: string, start_datetime: string): EventWithDetails {
  return { id, start_datetime } as EventWithDetails
}

describe("groupEventsByDay", () => {
  it("returns an empty map for empty input", () => {
    const map = groupEventsByDay([])
    expect(map.size).toBe(0)
  })

  it("puts two events on the same day into one bucket", () => {
    const events = [
      makeEvent("a", "2026-06-15T09:00:00.000Z"),
      makeEvent("b", "2026-06-15T18:00:00.000Z"),
    ]
    const map = groupEventsByDay(events)
    // The key is local "yyyy-MM-dd" — in any timezone offset test runs in,
    // both UTC timestamps that share the same local calendar date land in one bucket.
    // We check that there is exactly one distinct key and it contains both events.
    expect(map.size).toBe(1)
    const bucket = [...map.values()][0]
    expect(bucket).toHaveLength(2)
    expect(bucket.map((e) => e.id).sort()).toEqual(["a", "b"])
  })

  it("puts events on different days into separate buckets", () => {
    const events = [
      makeEvent("a", "2026-06-01T10:00:00.000Z"),
      makeEvent("b", "2026-06-02T10:00:00.000Z"),
      makeEvent("c", "2026-06-03T10:00:00.000Z"),
    ]
    const map = groupEventsByDay(events)
    expect(map.size).toBe(3)
  })

  it("bucket order within a day matches insertion order (not sorted)", () => {
    // The map helper does NOT sort — sorting is done in eventsForSelectedDate.
    const events = [
      makeEvent("first", "2026-06-10T20:00:00.000Z"),
      makeEvent("second", "2026-06-10T08:00:00.000Z"),
    ]
    const map = groupEventsByDay(events)
    expect(map.size).toBe(1)
    const bucket = [...map.values()][0]
    expect(bucket.map((e) => e.id)).toEqual(["first", "second"])
  })

  it("does not mutate the input array", () => {
    const events = [makeEvent("x", "2026-06-05T12:00:00.000Z")]
    const original = [...events]
    groupEventsByDay(events)
    expect(events).toEqual(original)
  })
})
