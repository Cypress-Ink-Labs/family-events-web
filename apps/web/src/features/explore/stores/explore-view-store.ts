import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"
import type {
  ExploreColumns,
  ExploreLayout,
  ExploreSortOption,
} from "@/features/explore/constants/view"

const INITIAL_VIEW = {
  layout: "grid" as ExploreLayout,
  columns: 3 as ExploreColumns,
  sort: "soonest" as ExploreSortOption,
  showImages: true,
}

interface ExploreViewStore {
  layout: ExploreLayout
  columns: ExploreColumns
  sort: ExploreSortOption
  showImages: boolean

  setLayout: (layout: ExploreLayout) => void
  setColumns: (columns: ExploreColumns) => void
  setSort: (sort: ExploreSortOption) => void
  setShowImages: (showImages: boolean) => void
  resetView: () => void
}

/** Only the preference fields are persisted — never the setters. */
export const partializeExploreView = (s: ExploreViewStore) => ({
  layout: s.layout,
  columns: s.columns,
  sort: s.sort,
  showImages: s.showImages,
})

export const useExploreViewStore = create<ExploreViewStore>()(
  devtools(
    persist(
      (set) => ({
        ...INITIAL_VIEW,

        setLayout: (layout) => set({ layout }),
        setColumns: (columns) => set({ columns }),
        setSort: (sort) => set({ sort }),
        setShowImages: (showImages) => set({ showImages }),
        resetView: () => set(INITIAL_VIEW),
      }),
      {
        name: "family-events-explore-view",
        partialize: partializeExploreView,
      }
    ),
    { name: "explore-view" }
  )
)
