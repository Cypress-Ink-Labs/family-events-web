import { beforeEach, describe, expect, it } from "vitest"
import { useExploreStore } from "./explore-store"

function resetStore() {
  useExploreStore.getState().resetFilters()
}

describe("useExploreStore", () => {
  beforeEach(resetStore)

  describe("toggleTagSlug", () => {
    it("adds slug when not present", () => {
      useExploreStore.getState().toggleTagSlug("music")
      expect(useExploreStore.getState().selectedTagSlugs).toContain("music")
    })

    it("removes slug when already present", () => {
      useExploreStore.getState().toggleTagSlug("music")
      useExploreStore.getState().toggleTagSlug("music")
      expect(useExploreStore.getState().selectedTagSlugs).not.toContain("music")
    })

    it("preserves other slugs when removing one", () => {
      useExploreStore.getState().toggleTagSlug("music")
      useExploreStore.getState().toggleTagSlug("sports")
      useExploreStore.getState().toggleTagSlug("music")
      expect(useExploreStore.getState().selectedTagSlugs).toEqual(["sports"])
    })
  })

  describe("resetFilters", () => {
    it("clears all filter state", () => {
      useExploreStore.getState().setKeyword("test")
      useExploreStore.getState().setActiveDateFilter("today")
      useExploreStore.getState().setSelectedAge("kids")
      useExploreStore.getState().setOnlyFree(true)
      useExploreStore.getState().toggleTagSlug("music")
      useExploreStore.getState().setActiveCategory("arts")

      useExploreStore.getState().resetFilters()

      const s = useExploreStore.getState()
      expect(s.keyword).toBe("")
      expect(s.activeDateFilter).toBeNull()
      expect(s.selectedAge).toBeNull()
      expect(s.onlyFree).toBe(false)
      expect(s.selectedTagSlugs).toEqual([])
      expect(s.activeCategory).toBeNull()
    })
  })
})
