/**
 * Back-compat barrel for the explore sections. Each component now lives in
 * its own file under `./explore/`. Import directly from those paths in new
 * code; this barrel keeps the page imports stable.
 */

export { ExploreHeader } from "@/features/explore/components/explore/explore-header"
export { ExploreSearchFilters } from "@/features/explore/components/explore/explore-search-filters"
export { ExploreActiveFilters } from "@/features/explore/components/explore/explore-active-filters"
export { ExploreCategoryGrid } from "@/features/explore/components/explore/explore-category-grid"
export { ExploreEventsSection } from "@/features/explore/components/explore/explore-events-section"
export { ExploreViewControls } from "@/features/explore/components/explore/explore-view-controls"
export { ExploreNeighborhoodCta } from "@/features/explore/components/explore/explore-neighborhood-cta"
