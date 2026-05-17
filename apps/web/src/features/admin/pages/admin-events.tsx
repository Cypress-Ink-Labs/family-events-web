import { useMemo } from "react"
import type { Event } from "@/lib/types"
import { useAdminStore } from "@/features/admin/stores/admin-store"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import {
  AdminEventReviewDialog,
  AdminEventsBulkBar,
  AdminEventsList,
  AdminEventsToolbar,
  AdminEventStatusFilterBar,
} from "@/features/admin/components/admin-events-sections"
import { AdminCityFilterBar } from "@/features/admin/components/admin-city-filter-bar"
import {
  useAdminEventFacets,
  useAdminEvents,
  useBatchUpdateAdminEventStatus,
  useDeleteAdminEvents,
  useUpdateAdminEventStatus,
} from "@/features/admin/hooks/use-admin-events"
import {
  useAdminEventAiTrace,
  useUpdateAdminEventTags,
} from "@/features/admin/hooks/use-admin-event-ai-trace"
import { useAdminCities } from "@/features/admin/hooks/use-admin-cities"
import { useCityFilter } from "@/features/admin/hooks/use-city-filter"
import { UNASSIGNED_CITY_KEY } from "@/lib/group-by-city"
import { useTags } from "@/features/events/hooks/use-tags"
import { toast } from "sonner"

type EventStatusFilter = Event["status"] | "all"

export function AdminEventsPage() {
  const keyword = useAdminStore((s) => s.keyword)
  const statusFilter = useAdminStore((s) => s.statusFilter)
  const selectedEventId = useAdminStore((s) => s.selectedEventId)
  const editingTagIds = useAdminStore((s) => s.editingTagIds)
  const selectedIds = useAdminStore((s) => s.selectedIds)
  const setKeyword = useAdminStore((s) => s.setKeyword)
  const setStatusFilter = useAdminStore((s) => s.setStatusFilter)
  const setSelectedEventId = useAdminStore((s) => s.setSelectedEventId)
  const setEditingTagIds = useAdminStore((s) => s.setEditingTagIds)
  const toggleSelectedId = useAdminStore((s) => s.toggleSelectedId)
  const setSelectedIds = useAdminStore((s) => s.setSelectedIds)
  const clearSelectedIds = useAdminStore((s) => s.clearSelectedIds)
  const { value: cityFilter, setValue: setCityFilter } = useCityFilter()

  const { data: events = [] } = useAdminEvents(keyword, statusFilter, cityFilter)
  const { data: facets = [] } = useAdminEventFacets(keyword)
  const { data: cities = [] } = useAdminCities()
  const { data: selectedEventTrace, isLoading: isTraceLoading } =
    useAdminEventAiTrace(selectedEventId)
  const { data: allTags = [] } = useTags()
  const updateStatusMutation = useUpdateAdminEventStatus()
  const batchUpdateStatusMutation = useBatchUpdateAdminEventStatus()
  const deleteEventsMutation = useDeleteAdminEvents()
  const updateTagsMutation = useUpdateAdminEventTags()
  const { toastError } = useAdminToast()

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null
  const tagNameById = new Map(allTags.map((tag) => [tag.id, tag.name]))
  const tagNameBySlug = new Map(allTags.map((tag) => [tag.slug, tag.name]))
  const draftEvents = events.filter((event) => event.status === "draft")
  const selectedDraftIds = [...selectedIds].filter((id) =>
    draftEvents.some((event) => event.id === id)
  )
  const selectedVisibleIds: string[] = []
  for (const event of events) {
    if (selectedIds.has(event.id)) {
      selectedVisibleIds.push(event.id)
    }
  }
  const allVisibleSelected = events.length > 0 && events.every((event) => selectedIds.has(event.id))

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const row of facets) {
      const matchesCity =
        cityFilter === "all"
          ? true
          : cityFilter === UNASSIGNED_CITY_KEY
            ? row.city_id === null
            : row.city_id === cityFilter
      if (!matchesCity) continue
      counts[row.status] = (counts[row.status] ?? 0) + 1
    }
    return counts
  }, [facets, cityFilter])

  const statusTotal = useMemo(
    () => Object.values(statusCounts).reduce((sum, n) => sum + n, 0),
    [statusCounts]
  )

  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const row of facets) {
      if (statusFilter !== "all" && row.status !== statusFilter) continue
      const key = row.city_id ?? UNASSIGNED_CITY_KEY
      counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, [facets, statusFilter])

  const cityTotal = useMemo(
    () => Object.values(cityCounts).reduce((sum, n) => sum + n, 0),
    [cityCounts]
  )

  const statusConfig: Record<Event["status"], { label: string; color: string }> = {
    draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
    published: {
      label: "Published",
      color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive" },
    archived: { label: "Archived", color: "bg-muted/50 text-muted-foreground" },
  }

  function toggleSelect(id: string) {
    toggleSelectedId(id)
  }

  function handleStatusFilterChange(status: EventStatusFilter) {
    setStatusFilter(status)
    clearSelectedIds()
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      clearSelectedIds()
    } else {
      setSelectedIds(new Set(events.map((event) => event.id)))
    }
  }

  async function batchUpdateStatus(newStatus: Event["status"]) {
    if (selectedDraftIds.length === 0) return
    try {
      const { count } = await batchUpdateStatusMutation.mutateAsync({
        eventIds: selectedDraftIds,
        status: newStatus,
      })
      toast.success(`${count} event${count === 1 ? "" : "s"} ${newStatus}`)
      clearSelectedIds()
    } catch (error) {
      toastError(error, "Bulk update failed.")
    }
  }

  async function deleteSelectedEvents() {
    if (selectedVisibleIds.length === 0) return
    const confirmed = window.confirm(
      `Delete ${selectedVisibleIds.length} event${
        selectedVisibleIds.length === 1 ? "" : "s"
      }? This cannot be undone.`
    )
    if (!confirmed) return

    try {
      const { count } = await deleteEventsMutation.mutateAsync(selectedVisibleIds)
      toast.success(`${count} event${count === 1 ? "" : "s"} deleted`)
      clearSelectedIds()
      if (selectedEventId && selectedVisibleIds.includes(selectedEventId)) {
        setSelectedEventId(null)
      }
    } catch (error) {
      toastError(error, "Bulk delete failed.")
    }
  }

  async function updateStatus(id: string, newStatus: Event["status"]) {
    try {
      await updateStatusMutation.mutateAsync({ eventId: id, status: newStatus })
      toast.success(`Event ${newStatus}`)
      setSelectedEventId(null)
    } catch (error) {
      toastError(error, "Failed to update event status.")
    }
  }

  async function saveTagOverrides() {
    if (!selectedEvent) return
    try {
      await updateTagsMutation.mutateAsync({ eventId: selectedEvent.id, tagIds: editingTagIds })
      toast.success("Tags updated")
    } catch (error) {
      toastError(error, "Failed to update tags.")
    }
  }

  return (
    <div className="space-y-6">
      <AdminEventStatusFilterBar
        statusFilter={statusFilter}
        counts={statusCounts}
        total={statusTotal}
        onChange={handleStatusFilterChange}
      />
      <AdminCityFilterBar
        cities={cities}
        counts={cityCounts}
        total={cityTotal}
        value={cityFilter}
        onChange={setCityFilter}
      />
      <AdminEventsToolbar
        keyword={keyword}
        onKeywordChange={setKeyword}
        eventCount={events.length}
        allVisibleSelected={allVisibleSelected}
        onToggleSelectAll={toggleSelectAll}
      />
      <AdminEventsBulkBar
        selectedCount={selectedVisibleIds.length}
        selectedDraftCount={selectedDraftIds.length}
        isStatusPending={batchUpdateStatusMutation.isPending}
        isDeletePending={deleteEventsMutation.isPending}
        onPublish={() => batchUpdateStatus("published")}
        onReject={() => batchUpdateStatus("rejected")}
        onDelete={deleteSelectedEvents}
        onClear={() => clearSelectedIds()}
      />
      <AdminEventsList
        events={events}
        selectedIds={selectedIds}
        statusConfig={statusConfig}
        cities={cities}
        cityFilter={cityFilter}
        onToggleSelect={toggleSelect}
        onOpenReview={(event) => {
          setSelectedEventId(event.id)
          setEditingTagIds((event.tags ?? []).map((tag) => tag.tag_id))
        }}
        onUpdateStatus={updateStatus}
      />
      <AdminEventReviewDialog
        event={selectedEvent}
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => {
          if (!open) setSelectedEventId(null)
        }}
        editingTagIds={editingTagIds}
        allTags={allTags}
        tagNameById={tagNameById}
        tagNameBySlug={tagNameBySlug}
        onToggleTag={(tagId) =>
          setEditingTagIds(
            editingTagIds.includes(tagId)
              ? editingTagIds.filter((id) => id !== tagId)
              : [...editingTagIds, tagId]
          )
        }
        onSaveTags={saveTagOverrides}
        selectedEventTrace={selectedEventTrace ?? null}
        isTraceLoading={isTraceLoading}
        onPublish={() => selectedEvent && updateStatus(selectedEvent.id, "published")}
        onReject={() => selectedEvent && updateStatus(selectedEvent.id, "rejected")}
      />
    </div>
  )
}
