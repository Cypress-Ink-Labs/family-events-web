import { create } from "zustand"
import { devtools } from "zustand/middleware"
import type { Event } from "@/lib/types"

type EventStatus = Event["status"]

interface AdminStore {
  keyword: string
  statusFilter: EventStatus | "all"
  selectedEventId: string | null
  editingTagIds: string[]
  selectedIds: Set<string>
  accessQuery: string
  scrapingSourceIds: Set<string>

  setKeyword: (k: string) => void
  setStatusFilter: (s: EventStatus | "all") => void
  setSelectedEventId: (id: string | null) => void
  setEditingTagIds: (ids: string[]) => void
  toggleSelectedId: (id: string) => void
  setSelectedIds: (ids: Set<string>) => void
  clearSelectedIds: () => void
  setAccessQuery: (q: string) => void
  addScrapingId: (id: string) => void
  removeScrapingId: (id: string) => void
}

export const useAdminStore = create<AdminStore>()(
  devtools(
    (set) => ({
      keyword: "",
      statusFilter: "all" as EventStatus | "all",
      selectedEventId: null,
      editingTagIds: [],
      selectedIds: new Set<string>(),
      accessQuery: "",
      scrapingSourceIds: new Set<string>(),

      setKeyword: (k) => set({ keyword: k }),
      setStatusFilter: (s) => set({ statusFilter: s }),
      setSelectedEventId: (id) => set({ selectedEventId: id }),
      setEditingTagIds: (ids) => set({ editingTagIds: ids }),
      toggleSelectedId: (id) =>
        set((s) => {
          const next = new Set(s.selectedIds)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return { selectedIds: next }
        }),
      setSelectedIds: (ids) => set({ selectedIds: ids }),
      clearSelectedIds: () => set({ selectedIds: new Set() }),
      setAccessQuery: (q) => set({ accessQuery: q }),
      addScrapingId: (id) =>
        set((s) => ({ scrapingSourceIds: new Set([...s.scrapingSourceIds, id]) })),
      removeScrapingId: (id) =>
        set((s) => {
          const next = new Set(s.scrapingSourceIds)
          next.delete(id)
          return { scrapingSourceIds: next }
        }),
    }),
    { name: "admin" }
  )
)
