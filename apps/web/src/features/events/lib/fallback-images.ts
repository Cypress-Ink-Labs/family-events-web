/**
 * Category-aware fallback images for events without photos.
 *
 * Uses a simple hash of the event ID to pick a deterministic image
 * from a curated set per tag category. Same event always gets the
 * same image, but different events get variety.
 *
 * Images are served via picsum.photos with curated IDs that match
 * the category (pre-screened for family-friendly content).
 */

// Curated picsum photo IDs by category.
// Each ID was manually selected for relevance and family-friendliness.
// Browse at https://picsum.photos/id/{id}/info
const CATEGORY_IMAGES: Record<string, number[]> = {
  "arts-crafts": [180, 399, 429, 452, 490],
  "baby-friendly": [177, 306, 447, 535, 556],
  cooking: [292, 312, 429, 488, 493],
  educational: [24, 180, 367, 395, 452],
  "family-festival": [122, 231, 325, 438, 533],
  holiday: [122, 231, 360, 438, 534],
  indoor: [24, 180, 367, 452, 490],
  music: [145, 233, 339, 453, 511],
  nature: [10, 15, 28, 29, 42],
  outdoor: [10, 15, 28, 106, 146],
  playgroup: [177, 306, 447, 535, 556],
  sports: [54, 106, 146, 309, 431],
  stem: [24, 180, 366, 395, 452],
  storytime: [24, 367, 399, 452, 490],
  community: [122, 231, 325, 433, 533],
}

const DEFAULT_IDS = [10, 24, 122, 180, 325, 399, 452]

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/**
 * Returns a deterministic, category-aware fallback image URL.
 * Same event ID always produces the same image.
 */
export function getFallbackImageUrl(
  eventId: string,
  tagSlugs: readonly string[],
  width = 800,
  height = 500
): string {
  let pool = DEFAULT_IDS
  for (const slug of tagSlugs) {
    if (CATEGORY_IMAGES[slug]) {
      pool = CATEGORY_IMAGES[slug]
      break
    }
  }

  const index = simpleHash(eventId) % pool.length
  return `https://picsum.photos/id/${pool[index]}/${width}/${height}`
}
