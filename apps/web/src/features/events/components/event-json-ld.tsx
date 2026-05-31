import type { EventWithDetails } from "@/shared/types"

/**
 * Schema.org `Event` JSON-LD for Google Rich Results.
 *
 * @see https://developers.google.com/search/docs/appearance/structured-data/event
 */

interface EventJsonLdData {
  "@context": "https://schema.org"
  "@type": "Event"
  name: string
  description?: string
  startDate: string
  endDate?: string
  eventStatus: string
  eventAttendanceMode: string
  location?: {
    "@type": "Place"
    name: string
    address?: string
  }
  image?: string[]
  url: string
  organizer?: {
    "@type": "Organization"
    name: string
  }
  offers?: {
    "@type": "Offer"
    price: string
    priceCurrency: string
    availability: string
    url: string
  }
}

export function buildEventJsonLd(
  event: EventWithDetails,
  pageUrl: string
): EventJsonLdData {
  const jsonLd: EventJsonLdData = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.start_datetime,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: pageUrl,
  }

  if (event.description) {
    jsonLd.description = event.description
  }

  if (event.end_datetime) {
    jsonLd.endDate = event.end_datetime
  }

  if (event.venue_name) {
    jsonLd.location = {
      "@type": "Place",
      name: event.venue_name,
    }
    if (event.address) {
      jsonLd.location.address = event.address
    }
  }

  if (event.images.length > 0) {
    jsonLd.image = event.images
  }

  if (event.source_name) {
    jsonLd.organizer = {
      "@type": "Organization",
      name: event.source_name,
    }
  }

  jsonLd.offers = {
    "@type": "Offer",
    price: event.is_free ? "0" : (event.price?.toString() ?? "0"),
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: event.source_url ?? pageUrl,
  }

  return jsonLd
}

/**
 * Renders a `<script type="application/ld+json">` tag with Schema.org Event
 * structured data derived from the event's database fields.
 */
export function EventJsonLd({ event }: { event: EventWithDetails }) {
  const pageUrl = `${window.location.origin}/events/${event.id}`
  const jsonLd = buildEventJsonLd(event, pageUrl)

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
