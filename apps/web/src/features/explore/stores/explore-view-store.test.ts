import { beforeEach, describe, expect, it } from "vitest"
import { partializeExploreView, useExploreViewStore } from "./explore-view-store"

function resetStore() {
  useExploreViewStore.getState().resetView()
}

describe("useExploreViewStore", () => {
  beforeEach(resetStore)

  describe("defaults", () => {
    it("starts grid / 3 columns / soonest / images on", () => {
      const s = useExploreViewStore.getState()
      expect(s.layout).toBe("grid")
      expect(s.columns).toBe(3)
      expect(s.sort).toBe("soonest")
      expect(s.showImages).toBe(true)
    })
  })

  describe("setters", () => {
    it("setLayout updates layout", () => {
      useExploreViewStore.getState().setLayout("list")
      expect(useExploreViewStore.getState().layout).toBe("list")
    })

    it("setColumns updates columns", () => {
      useExploreViewStore.getState().setColumns(2)
      expect(useExploreViewStore.getState().columns).toBe(2)
    })

    it("setSort updates sort", () => {
      useExploreViewStore.getState().setSort("price-asc")
      expect(useExploreViewStore.getState().sort).toBe("price-asc")
    })

    it("setShowImages updates showImages", () => {
      useExploreViewStore.getState().setShowImages(false)
      expect(useExploreViewStore.getState().showImages).toBe(false)
    })
  })

  describe("resetView", () => {
    it("restores all defaults", () => {
      const store = useExploreViewStore.getState()
      store.setLayout("compact")
      store.setColumns(2)
      store.setSort("rating-desc")
      store.setShowImages(false)

      useExploreViewStore.getState().resetView()

      const s = useExploreViewStore.getState()
      expect(s.layout).toBe("grid")
      expect(s.columns).toBe(3)
      expect(s.sort).toBe("soonest")
      expect(s.showImages).toBe(true)
    })
  })

  describe("persistence", () => {
    it("persists exactly the four preference fields (no setters)", () => {
      const persisted = partializeExploreView(useExploreViewStore.getState())
      expect(Object.keys(persisted).sort()).toEqual(["columns", "layout", "showImages", "sort"])
    })
  })
})
