import { describe, expect, it } from "vitest"
import { eventTagSlugs, resolveEventImageUrl } from "./event-card-media"
import type { EventWithDetails } from "@/shared/types"

// Minimal event stub — only the fields consumed by the helpers.
function makeEvent(
  overrides: Partial<Pick<EventWithDetails, "id" | "images" | "tags">> = {}
): Pick<EventWithDetails, "id" | "images" | "tags"> {
  return {
    id: "test-event-id",
    images: [],
    tags: [],
    ...overrides,
  }
}

describe("eventTagSlugs", () => {
  it("returns slugs from event tags", () => {
    const event = makeEvent({
      tags: [
        {
          tag_id: "1",
          event_id: "e1",
          tag: { id: "1", slug: "outdoor", name: "Outdoor" },
        } as never,
        { tag_id: "2", event_id: "e1", tag: { id: "2", slug: "music", name: "Music" } } as never,
      ],
    })
    expect(eventTagSlugs(event)).toEqual(["outdoor", "music"])
  })

  it("returns empty array when tags is undefined", () => {
    const event = makeEvent({ tags: undefined })
    expect(eventTagSlugs(event)).toEqual([])
  })

  it("returns empty array when tags is empty", () => {
    const event = makeEvent({ tags: [] })
    expect(eventTagSlugs(event)).toEqual([])
  })
})

describe("resolveEventImageUrl", () => {
  it("returns the first image when it is a valid https URL", () => {
    const url = "https://example.com/photo.jpg"
    const event = makeEvent({ images: [url] })
    expect(resolveEventImageUrl(event, 600, 400)).toBe(url)
  })

  it("returns the first image when it is a valid http URL", () => {
    const url = "http://example.com/photo.jpg"
    const event = makeEvent({ images: [url] })
    expect(resolveEventImageUrl(event, 600, 400)).toBe(url)
  })

  it("returns a fallback URL when images array is empty", () => {
    const event = makeEvent({ images: [], id: "abc123" })
    const result = resolveEventImageUrl(event, 640, 360)
    expect(result).toMatch(/^https:\/\/picsum\.photos\/id\/\d+\/640\/360$/)
  })

  it("returns a fallback URL when images is undefined-like (empty array)", () => {
    const event = makeEvent({ images: [] })
    const result = resolveEventImageUrl(event, 200, 200)
    expect(result).toMatch(/^https:\/\/picsum\.photos\/id\/\d+\/200\/200$/)
  })

  it("uses the given width and height in the fallback URL", () => {
    const event = makeEvent({ images: [] })
    const result1200 = resolveEventImageUrl(event, 1200, 630)
    expect(result1200).toMatch(/\/1200\/630$/)
    const result200 = resolveEventImageUrl(event, 200, 200)
    expect(result200).toMatch(/\/200\/200$/)
  })

  it("rejects unsafe URL schemes and falls back", () => {
    const event = makeEvent({ images: ["javascript:alert(1)"] })
    const result = resolveEventImageUrl(event, 600, 400)
    // Should fall through to picsum fallback, not return the unsafe URL
    expect(result).toMatch(/^https:\/\/picsum\.photos\//)
    expect(result).not.toContain("javascript")
  })

  it("produces a deterministic result for the same event id", () => {
    const event = makeEvent({ images: [], id: "stable-id-xyz" })
    const result1 = resolveEventImageUrl(event, 600, 400)
    const result2 = resolveEventImageUrl(event, 600, 400)
    expect(result1).toBe(result2)
  })

  it("uses tag slugs for category-aware fallback selection", () => {
    const sportEvent = makeEvent({
      images: [],
      id: "same-id",
      tags: [
        {
          tag_id: "1",
          event_id: "e1",
          tag: { id: "1", slug: "outdoor", name: "Outdoor" },
        } as never,
      ],
    })
    const defaultEvent = makeEvent({ images: [], id: "same-id", tags: [] })
    // Both produce picsum URLs; they may differ because tag affects pool selection
    const sportUrl = resolveEventImageUrl(sportEvent, 600, 400)
    const defaultUrl = resolveEventImageUrl(defaultEvent, 600, 400)
    expect(sportUrl).toMatch(/^https:\/\/picsum\.photos\//)
    expect(defaultUrl).toMatch(/^https:\/\/picsum\.photos\//)
  })
})
