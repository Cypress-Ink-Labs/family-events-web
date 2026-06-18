import type { EventWithDetails } from "@/shared/types"
import { safeImageSrc } from "@/infrastructure/safe-url"
import { getFallbackImageUrl } from "@/features/events/lib/fallback-images"

/**
 * Returns the tag slugs for an event. Handles missing/undefined tags gracefully.
 */
export function eventTagSlugs(event: Pick<EventWithDetails, "tags">): string[] {
  return (event.tags ?? []).map((t) => t.tag.slug)
}

/**
 * Resolves the display image URL for an event: uses the first uploaded image when
 * it has a safe http(s) scheme, otherwise returns a deterministic category-aware
 * fallback sized to the given dimensions.
 */
export function resolveEventImageUrl(
  event: Pick<EventWithDetails, "id" | "images" | "tags">,
  width: number,
  height: number
): string {
  return (
    safeImageSrc(event.images?.[0]) ??
    getFallbackImageUrl(event.id, eventTagSlugs(event), width, height)
  )
}
