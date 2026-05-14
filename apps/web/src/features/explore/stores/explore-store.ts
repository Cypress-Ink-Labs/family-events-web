import { create } from "zustand"
import { devtools } from "zustand/middleware"

const INITIAL_FILTERS = {
  keyword: "",
  activeDateFilter: null as string | null,
  selectedAge: null as string | null,
  onlyFree: false,
  selectedTagSlugs: [] as string[],
  activeCategory: null as string | null,
}

interface ExploreStore {
  keyword: string
  activeDateFilter: string | null
  selectedAge: string | null
  onlyFree: boolean
  selectedTagSlugs: string[]
  activeCategory: string | null

  setKeyword: (k: string) => void
  setActiveDateFilter: (f: string | null) => void
  setSelectedAge: (a: string | null) => void
  setOnlyFree: (v: boolean) => void
  setSelectedTagSlugs: (slugs: string[]) => void
  toggleTagSlug: (slug: string) => void
  setActiveCategory: (c: string | null) => void
  resetFilters: () => void
}

export const useExploreStore = create<ExploreStore>()(
  devtools(
    (set) => ({
      ...INITIAL_FILTERS,

      setKeyword: (k) => set({ keyword: k }),
      setActiveDateFilter: (f) => set({ activeDateFilter: f }),
      setSelectedAge: (a) => set({ selectedAge: a }),
      setOnlyFree: (v) => set({ onlyFree: v }),
      setSelectedTagSlugs: (slugs) => set({ selectedTagSlugs: slugs }),
      toggleTagSlug: (slug) =>
        set((s) => ({
          selectedTagSlugs: s.selectedTagSlugs.includes(slug)
            ? s.selectedTagSlugs.filter((t) => t !== slug)
            : [...s.selectedTagSlugs, slug],
        })),
      setActiveCategory: (c) => set({ activeCategory: c }),
      resetFilters: () => set(INITIAL_FILTERS),
    }),
    { name: "explore" }
  )
)
