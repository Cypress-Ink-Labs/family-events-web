import type { EventCardVariant } from "@/features/events/components/event-card/_shared"

/**
 * View / display controls for the explore page. These let visitors tune how
 * the event list renders (layout, grid density, sort, image visibility).
 *
 * IMPORTANT: the grid column className strings below MUST be written as full
 * literals so the Tailwind JIT compiler can see them. Never build these class
 * strings dynamically (e.g. `lg:grid-cols-${n}`) — the classes would be purged.
 */

export const EXPLORE_LAYOUT_OPTIONS = [
  { label: "Grid", value: "grid" },
  { label: "List", value: "list" },
  { label: "Compact", value: "compact" },
] as const

export type ExploreLayout = (typeof EXPLORE_LAYOUT_OPTIONS)[number]["value"]

export const EXPLORE_COLUMN_OPTIONS = [2, 3, 4] as const

export type ExploreColumns = (typeof EXPLORE_COLUMN_OPTIONS)[number]

export const EXPLORE_SORT_OPTIONS = [
  { label: "Soonest", value: "soonest" },
  { label: "Latest", value: "latest" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Top Rated", value: "rating-desc" },
] as const

export type ExploreSortOption = (typeof EXPLORE_SORT_OPTIONS)[number]["value"]

/** Literal grid container classes, keyed by desktop column count. */
export const GRID_COLUMN_CLASSNAMES: Record<ExploreColumns, string> = {
  2: "grid grid-cols-1 gap-4 sm:grid-cols-2",
  3: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
}

export const LIST_CONTAINER_CLASSNAME = "flex flex-col gap-4"

/** Compact cards carry their own border-bottom separators, so no gap. */
export const COMPACT_CONTAINER_CLASSNAME = "flex flex-col"

export const CARD_VARIANT_BY_LAYOUT: Record<ExploreLayout, EventCardVariant> = {
  grid: "default",
  list: "list",
  compact: "compact",
}
