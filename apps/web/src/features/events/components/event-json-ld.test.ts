import { describe, it, expect } from "vitest"
import { buildEventJsonLd } from "./event-json-ld"
import type { EventWithDetails } from "@/shared/types"

// ---------------------------------------------------------------------------
// Minimal event fixture — only fields used by buildEventJsonLd need values.
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<EventWithDetails> = {}): EventWithDetails {
  return {
    id: "event-123",
    title: "Kids Coding Workshop",
    description: "A fun workshop for kids to learn coding basics.",
    start_datetime: "2026-06-15T10:00:00.000Z",
    end_datetime: "2026-06-15T12:00:00.000Z",
    timezone: "America/Chicago",
    venue_name: "Lafayette Library",
    address: "301 W Congress St, Lafayette, LA 70501",
    city_id: "city-1",
    latitude: 30.224,
    longitude: -92.019,
    age_min: 6,
    age_max: 12,
    price: 0,
    is_free: true,
    source_url: "https://example.com/event/123",
    source_name: "City Library",
    source_id: "source-1",
    images: ["https://images.example.com/workshop.jpg"],
    status: "published",
    ai_confidence: null,
    ai_tag_provider: null,
    ai_tag_model: null,
    ai_tag_status: null,
    search_vector: null,
    is_outdoor: false,
    is_featured: false,
    view_count: 0,
    admin_locked_fields: [],
    admin_last_edited_at: null,
    admin_last_edited_by: null,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
    ...overrides,
  } as EventWithDetails
}

describe("buildEventJsonLd", () => {
  it("produces a valid Schema.org Event shape", () => {
    const event = makeEvent()
    const result = buildEventJsonLd(event, "https://family-events.org/events/event-123")

    expect(result["@context"]).toBe("https://schema.org")
    expect(result["@type"]).toBe("Event")
    expect(result.name).toBe("Kids Coding Workshop")
    expect(result.description).toBe("A fun workshop for kids to learn coding basics.")
    expect(result.startDate).toBe("2026-06-15T10:00:00.000Z")
    expect(result.endDate).toBe("2026-06-15T12:00:00.000Z")
    expect(result.url).toBe("https://family-events.org/events/event-123")
    expect(result.eventStatus).toBe("https://schema.org/EventScheduled")
    expect(result.eventAttendanceMode).toBe("https://schema.org/OfflineEventAttendanceMode")
  })

  it("includes location with place name and address", () => {
    const result = buildEventJsonLd(makeEvent(), "https://family-events.org/events/event-123")

    expect(result.location).toEqual({
      "@type": "Place",
      name: "Lafayette Library",
      address: "301 W Congress St, Lafayette, LA 70501",
    })
  })

  it("includes images when present", () => {
    const result = buildEventJsonLd(makeEvent(), "https://family-events.org/events/event-123")

    expect(result.image).toEqual(["https://images.example.com/workshop.jpg"])
  })

  it("omits images when the array is empty", () => {
    const result = buildEventJsonLd(
      makeEvent({ images: [] }),
      "https://family-events.org/events/event-123"
    )

    expect(result.image).toBeUndefined()
  })

  it("includes organizer from source_name", () => {
    const result = buildEventJsonLd(makeEvent(), "https://family-events.org/events/event-123")

    expect(result.organizer).toEqual({
      "@type": "Organization",
      name: "City Library",
    })
  })

  it("omits organizer when source_name is null", () => {
    const result = buildEventJsonLd(
      makeEvent({ source_name: null }),
      "https://family-events.org/events/event-123"
    )

    expect(result.organizer).toBeUndefined()
  })

  it("shows price 0 for free events", () => {
    const result = buildEventJsonLd(
      makeEvent({ is_free: true, price: 0 }),
      "https://family-events.org/events/event-123"
    )

    expect(result.offers?.price).toBe("0")
    expect(result.offers?.priceCurrency).toBe("USD")
  })

  it("shows actual price for paid events", () => {
    const result = buildEventJsonLd(
      makeEvent({ is_free: false, price: 25 }),
      "https://family-events.org/events/event-123"
    )

    expect(result.offers?.price).toBe("25")
  })

  it("uses page URL as offer URL when source_url is null", () => {
    const pageUrl = "https://family-events.org/events/event-123"
    const result = buildEventJsonLd(makeEvent({ source_url: null }), pageUrl)

    expect(result.offers?.url).toBe(pageUrl)
  })

  it("omits description when null", () => {
    const result = buildEventJsonLd(
      makeEvent({ description: null }),
      "https://family-events.org/events/event-123"
    )

    expect(result.description).toBeUndefined()
  })

  it("omits endDate when null", () => {
    const result = buildEventJsonLd(
      makeEvent({ end_datetime: null }),
      "https://family-events.org/events/event-123"
    )

    expect(result.endDate).toBeUndefined()
  })

  it("omits location when venue_name is null", () => {
    const result = buildEventJsonLd(
      makeEvent({ venue_name: null }),
      "https://family-events.org/events/event-123"
    )

    expect(result.location).toBeUndefined()
  })

  it("includes location without address when address is null", () => {
    const result = buildEventJsonLd(
      makeEvent({ address: null }),
      "https://family-events.org/events/event-123"
    )

    expect(result.location).toEqual({
      "@type": "Place",
      name: "Lafayette Library",
    })
  })
})
