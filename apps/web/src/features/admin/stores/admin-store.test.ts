import { beforeEach, describe, expect, it } from "vitest"
import { useAdminStore } from "./admin-store"

function resetStore() {
  useAdminStore.setState({
    keyword: "",
    statusFilter: "all",
    selectedEventId: null,
    editingTagIds: [],
    selectedIds: new Set(),
    accessQuery: "",
    scrapingSourceIds: new Set(),
  })
}

describe("useAdminStore", () => {
  beforeEach(resetStore)

  describe("selectedIds", () => {
    it("toggleSelectedId adds id when not present", () => {
      useAdminStore.getState().toggleSelectedId("a")
      expect(useAdminStore.getState().selectedIds.has("a")).toBe(true)
    })

    it("toggleSelectedId removes id when already present", () => {
      useAdminStore.getState().toggleSelectedId("a")
      useAdminStore.getState().toggleSelectedId("a")
      expect(useAdminStore.getState().selectedIds.has("a")).toBe(false)
    })

    it("clearSelectedIds empties the set", () => {
      useAdminStore.getState().toggleSelectedId("a")
      useAdminStore.getState().toggleSelectedId("b")
      useAdminStore.getState().clearSelectedIds()
      expect(useAdminStore.getState().selectedIds.size).toBe(0)
    })

    it("setSelectedIds replaces the entire set", () => {
      useAdminStore.getState().toggleSelectedId("a")
      useAdminStore.getState().setSelectedIds(new Set(["x", "y"]))
      const ids = useAdminStore.getState().selectedIds
      expect(ids.has("a")).toBe(false)
      expect(ids.has("x")).toBe(true)
      expect(ids.has("y")).toBe(true)
    })
  })

  describe("scrapingSourceIds", () => {
    it("addScrapingId adds the id", () => {
      useAdminStore.getState().addScrapingId("src-1")
      expect(useAdminStore.getState().scrapingSourceIds.has("src-1")).toBe(true)
    })

    it("removeScrapingId removes the id", () => {
      useAdminStore.getState().addScrapingId("src-1")
      useAdminStore.getState().removeScrapingId("src-1")
      expect(useAdminStore.getState().scrapingSourceIds.has("src-1")).toBe(false)
    })

    it("removeScrapingId on missing id is a no-op", () => {
      useAdminStore.getState().removeScrapingId("nope")
      expect(useAdminStore.getState().scrapingSourceIds.size).toBe(0)
    })
  })
})
