import { describe, expect, it } from "vitest"
import type { EventWithDetails } from "@/lib/types"
import {
  changedEventPatch,
  editorValuesToEventPatch,
  eventToEditorValues,
} from "./event-editor-mappers"

function event(overrides: Partial<EventWithDetails> = {}): EventWithDetails {
  return {
    id: "event-1",
    title: "Story Time",
    description: "Books",
    start_datetime: "2026-06-01T15:00:00.000Z",
    end_datetime: null,
    timezone: "America/Chicago",
    venue_name: "Library",
    address: "1 Main",
    city_id: "city-1",
    latitude: null,
    longitude: null,
    age_min: 2,
    age_max: 6,
    price: 5,
    is_free: false,
    is_outdoor: null,
    source_url: "https://example.com/event",
    source_name: "Example",
    source_id: "source-1",
    images: ["https://example.com/one.jpg"],
    status: "draft",
    ai_confidence: null,
    ai_tag_provider: null,
    ai_tag_model: null,
    recurrence_info: { freq: "weekly" },
    is_featured: false,
    view_count: 0,
    search_vector: null,
    admin_locked_fields: [],
    admin_last_edited_at: null,
    admin_last_edited_by: null,
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z",
    tags: [
      {
        event_id: "event-1",
        tag_id: "tag-1",
        confidence: 1,
        is_manual_override: true,
        created_at: "2026-05-01T00:00:00.000Z",
        tag: {
          id: "tag-1",
          name: "Music",
          slug: "music",
          color: "#111111",
          category: "theme",
          is_system: true,
          created_at: "2026-05-01T00:00:00.000Z",
        },
      },
    ],
    ...overrides,
  }
}

describe("event editor mappers", () => {
  it("converts event rows to form defaults", () => {
    const values = eventToEditorValues(event())
    expect(values.title).toBe("Story Time")
    expect(values.imagesText).toBe("https://example.com/one.jpg")
    expect(values.recurrenceInfoText).toContain('"freq": "weekly"')
    expect(values.tagIds).toEqual(["tag-1"])
  })

  it("maps free events to a null saved price and ignores blank images", () => {
    const patch = editorValuesToEventPatch({
      ...eventToEditorValues(event()),
      is_free: true,
      price: 12,
      imagesText: "\nhttps://example.com/two.jpg\n\n",
    })
    expect(patch.price).toBeNull()
    expect(patch.images).toEqual(["https://example.com/two.jpg"])
  })

  it("returns only changed event fields", () => {
    const initial = eventToEditorValues(event())
    const changed = { ...initial, title: "New title", tagIds: ["tag-2"] }
    expect(changedEventPatch(initial, changed)).toEqual({ title: "New title" })
  })
})
