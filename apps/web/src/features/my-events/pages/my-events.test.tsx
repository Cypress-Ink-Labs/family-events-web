import { describe, expect, it } from "vitest"
import type { Favorite, UserCalendarEvent } from "@/lib/types"
import { buildSavedEventIds } from "./my-events"

function favorite(eventId: string): Favorite {
  return {
    id: `fav-${eventId}`,
    user_id: "user-1",
    event_id: eventId,
    created_at: "2026-05-10T00:00:00.000Z",
  }
}

function calendarEntry(eventId: string): UserCalendarEvent {
  return {
    id: `cal-${eventId}`,
    user_id: "user-1",
    event_id: eventId,
    added_at: "2026-05-10T00:00:00.000Z",
    notes: null,
  }
}

describe("buildSavedEventIds", () => {
  it("dedupes overlapping favorite and calendar ids", () => {
    const result = buildSavedEventIds(
      [favorite("event-1"), favorite("event-2")],
      [calendarEntry("event-2"), calendarEntry("event-3")]
    )

    expect(result).toEqual(["event-1", "event-2", "event-3"])
  })

  it("drops a row only after the id disappears from both sources", () => {
    const baseline = buildSavedEventIds([favorite("event-9")], [calendarEntry("event-9")])
    expect(baseline).toContain("event-9")

    const afterFavoriteToggle = buildSavedEventIds([], [calendarEntry("event-9")])
    expect(afterFavoriteToggle).toContain("event-9")

    const afterCalendarToggle = buildSavedEventIds([], [])
    expect(afterCalendarToggle).not.toContain("event-9")
  })
})
