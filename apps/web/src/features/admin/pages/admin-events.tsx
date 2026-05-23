import { useEffect, useMemo, useState } from "react"
import { useAdminStore } from "@/features/admin/stores/admin-store"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import { AdminEventReviewDialog } from "@/features/admin/components/admin-event-review-panel"
import { AdminEventsList } from "@/features/admin/components/admin-events-list"
import {
  AdminEventsBulkBar,
  AdminLlmReviewFilterBar,
  AdminEventsToolbar,
  AdminEventStatusFilterBar,
  type AdminLlmReviewFilter,
} from "@/features/admin/components/admin-events-sections"
import { AdminCityFilterBar } from "@/features/admin/components/admin-city-filter-bar"
import { useAdminEventDetail } from "@/features/admin/hooks/events/use-admin-event-detail"
import {
  useAdminEventAiTrace,
  useUpdateAdminEventTags,
} from "@/features/admin/hooks/events/use-admin-event-ai-trace"
import {
  useAdminEventFacets,
  useAdminEventsInfinite,
  useBatchUpdateAdminEventStatus,
  useDeleteAdminEvents,
  useUpdateAdminEventStatus,
} from "@/features/admin/hooks/events/use-admin-events"
import { useAdminCities } from "@/features/admin/hooks/use-admin-cities"
import { useCityFilter } from "@/features/admin/hooks/use-city-filter"
import { UNASSIGNED_CITY_KEY, type CityFilterValue } from "@/lib/events/group-by-city"
import { useTags } from "@/features/events/hooks/use-tags"
import type { Event } from "@/lib/types"
import { toast } from "sonner"

type EventStatusFilter = Event["status"] | "all"

const STATUS_CONFIG: Record<Event["status"], { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
  published: {
    label: "Published",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive" },
  archived: { label: "Archived", color: "bg-muted/50 text-muted-foreground" },
}

function getActiveTotal({
  facets,
  statusFilter,
  cityFilter,
}: {
  facets: Array<{ status: string; city_id: string | null; count: number }>
  statusFilter: EventStatusFilter
  cityFilter: CityFilterValue
}) {
  return facets.reduce((acc, row) => {
    if (statusFilter !== "all" && row.status !== statusFilter) {
      return acc
    }

    if (cityFilter === "all") {
      return acc + row.count
    }

    if (cityFilter === UNASSIGNED_CITY_KEY) {
      return row.city_id === null ? acc + row.count : acc
    }

    return row.city_id === cityFilter ? acc + row.count : acc
  }, 0)
}

function AdminEventReviewSection({
  onUpdateStatus,
}: {
  onUpdateStatus: (eventId: string, status: Event["status"]) => Promise<void>
}) {
  const selectedEventId = useAdminStore((state) => state.selectedEventId)
  const editingTagIds = useAdminStore((state) => state.editingTagIds)
  const setSelectedEventId = useAdminStore((state) => state.setSelectedEventId)
  const setEditingTagIds = useAdminStore((state) => state.setEditingTagIds)

  const selectedEvent = useAdminEventDetail(selectedEventId ?? undefined)
  const { data: selectedEventTrace, isLoading: isTraceLoading } =
    useAdminEventAiTrace(selectedEventId)
  const { data: allTags = [] } = useTags()
  const { mutate: updateTags } = useUpdateAdminEventTags()
  const { toastError } = useAdminToast()

  const tagNameById = new Map(allTags.map((tag) => [tag.id, tag.name]))
  const tagNameBySlug = new Map(allTags.map((tag) => [tag.slug, tag.name]))

  useEffect(() => {
    if (selectedEventId && !selectedEvent.isLoading && selectedEvent.data === null) {
      setSelectedEventId(null)
    }
  }, [selectedEvent.data, selectedEvent.isLoading, selectedEventId, setSelectedEventId])

  async function saveTagOverrides() {
    if (!selectedEvent.data) return
    try {
      await updateTags({ eventId: selectedEvent.data.id, tagIds: editingTagIds })
      toast.success("Tags updated")
    } catch (error) {
      toastError(error, "Failed to update tags.")
    }
  }

  return (
    <AdminEventReviewDialog
      event={selectedEvent.data ?? null}
      open={Boolean(selectedEvent.data)}
      onOpenChange={(open) => {
        if (!open) setSelectedEventId(null)
      }}
      editingTagIds={editingTagIds}
      allTags={allTags}
      tagNameById={tagNameById}
      tagNameBySlug={tagNameBySlug}
      onToggleTag={(tagId) => {
        setEditingTagIds(
          editingTagIds.includes(tagId)
            ? editingTagIds.filter((id) => id !== tagId)
            : [...editingTagIds, tagId]
        )
      }}
      onSaveTags={saveTagOverrides}
      selectedEventTrace={selectedEventTrace ?? null}
      isTraceLoading={isTraceLoading}
      onPublish={() => {
        if (selectedEvent.data) void onUpdateStatus(selectedEvent.data.id, "published")
      }}
      onReject={() => {
        if (selectedEvent.data) void onUpdateStatus(selectedEvent.data.id, "rejected")
      }}
      onSetDraft={() => {
        if (selectedEvent.data) void onUpdateStatus(selectedEvent.data.id, "draft")
      }}
    />
  )
}

export function AdminEventsPage() {
  const keyword = useAdminStore((state) => state.keyword)
  const statusFilter = useAdminStore((state) => state.statusFilter)
  const selectedIds = useAdminStore((state) => state.selectedIds)
  const setKeyword = useAdminStore((state) => state.setKeyword)
  const setStatusFilter = useAdminStore((state) => state.setStatusFilter)
  const setSelectedEventId = useAdminStore((state) => state.setSelectedEventId)
  const toggleSelectedId = useAdminStore((state) => state.toggleSelectedId)
  const setSelectedIds = useAdminStore((state) => state.setSelectedIds)
  const clearSelectedIds = useAdminStore((state) => state.clearSelectedIds)
  const [llmReviewFilter, setLlmReviewFilter] = useState<AdminLlmReviewFilter>("all")

  const { value: cityFilter, setValue: setCityFilter } = useCityFilter()

  const {
    data: eventList,
    isLoading: isEventListLoading,
    isError: isEventListError,
    error: eventListError,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage: listHasNextPage,
    refetch: refetchEvents,
  } = useAdminEventsInfinite({ keyword, status: statusFilter, cityFilter, llmReviewFilter })

  const events = useMemo(() => eventList?.events ?? [], [eventList?.events])
  const loadedCount = eventList?.loadedCount ?? 0
  const totalCount = eventList?.totalCount ?? 0
  const hasNextPage = eventList?.hasNextPage ?? listHasNextPage
  const isFetchingNext = eventList?.isFetchingNextPage ?? isFetchingNextPage

  const { data: facets = [] } = useAdminEventFacets(keyword)
  const { data: cities = [] } = useAdminCities()

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
      counts[row.status] = (counts[row.status] ?? 0) + row.count
    }
    return counts
  }, [cityFilter, facets])

  const statusTotal = useMemo(
    () => Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
    [statusCounts]
  )

  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const row of facets) {
      if (statusFilter !== "all" && row.status !== statusFilter) continue

      const key = row.city_id ?? UNASSIGNED_CITY_KEY
      counts[key] = (counts[key] ?? 0) + row.count
    }
    return counts
  }, [facets, statusFilter])

  const cityTotal = useMemo(
    () => Object.values(cityCounts).reduce((sum, count) => sum + count, 0),
    [cityCounts]
  )

  const activeTotal = useMemo(
    () => getActiveTotal({ facets, statusFilter, cityFilter }),
    [cityFilter, facets, statusFilter]
  )

  const totalCountForToolbar = totalCount > 0 ? totalCount : activeTotal

  const selectedVisibleIds = useMemo(() => {
    const result = new Set<string>()
    for (const event of events) {
      if (selectedIds.has(event.id)) result.add(event.id)
    }
    return result
  }, [events, selectedIds])

  const selectedLoadedIds = useMemo(() => [...selectedVisibleIds], [selectedVisibleIds])
  const allLoadedSelected = loadedCount > 0 && selectedLoadedIds.length === events.length

  const selectedDraftIds = useMemo(
    () =>
      selectedLoadedIds.filter((id) => events.find((event) => event.id === id)?.status === "draft"),
    [events, selectedLoadedIds]
  )

  const { toastError } = useAdminToast()

  const updateStatusMutation = useUpdateAdminEventStatus()
  const batchUpdateStatusMutation = useBatchUpdateAdminEventStatus()
  const deleteEventsMutation = useDeleteAdminEvents()

  function handleKeywordChange(nextKeyword: string) {
    setKeyword(nextKeyword)
    clearSelectedIds()
  }

  function handleStatusFilterChange(nextStatus: EventStatusFilter) {
    setStatusFilter(nextStatus)
    clearSelectedIds()
  }

  function handleCityFilterChange(nextCityFilter: typeof cityFilter) {
    setCityFilter(nextCityFilter)
    clearSelectedIds()
  }

  function handleLlmReviewFilterChange(nextFilter: AdminLlmReviewFilter) {
    setLlmReviewFilter(nextFilter)
    clearSelectedIds()
  }

  function toggleSelectAll() {
    if (allLoadedSelected) {
      clearSelectedIds()
    } else {
      setSelectedIds(new Set(events.map((event) => event.id)))
    }
  }

  async function batchUpdateStatus(nextStatus: Event["status"]) {
    if (selectedDraftIds.length === 0) return

    try {
      const { count } = await batchUpdateStatusMutation.mutateAsync({
        eventIds: selectedDraftIds,
        status: nextStatus,
      })
      toast.success(`${count} event${count === 1 ? "" : "s"} ${nextStatus}`)
      clearSelectedIds()
    } catch (error) {
      toastError(error, "Bulk update failed.")
    }
  }

  async function deleteSelectedEvents() {
    if (selectedLoadedIds.length === 0) return

    if (
      !window.confirm(
        `Delete ${selectedLoadedIds.length} event${selectedLoadedIds.length === 1 ? "" : "s"}? This cannot be undone.`
      )
    ) {
      return
    }

    try {
      const { count } = await deleteEventsMutation.mutateAsync(selectedLoadedIds)
      toast.success(`${count} event${count === 1 ? "" : "s"} deleted`)
      clearSelectedIds()
      const selectedEventId = useAdminStore.getState().selectedEventId
      if (selectedEventId && selectedLoadedIds.includes(selectedEventId)) {
        setSelectedEventId(null)
      }
    } catch (error) {
      toastError(error, "Bulk delete failed.")
    }
  }

  async function updateStatus(eventId: string, nextStatus: Event["status"]) {
    try {
      await updateStatusMutation.mutateAsync({ eventId, status: nextStatus })
      toast.success(`Event ${nextStatus}`)
      setSelectedEventId(null)
    } catch (error) {
      toastError(error, "Failed to update event status.")
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
        onChange={handleCityFilterChange}
      />
      <AdminLlmReviewFilterBar
        llmReviewFilter={llmReviewFilter}
        onChange={handleLlmReviewFilterChange}
      />
      <AdminEventsToolbar
        keyword={keyword}
        onKeywordChange={handleKeywordChange}
        loadedCount={loadedCount}
        totalCount={totalCountForToolbar}
        allLoadedSelected={allLoadedSelected}
        onToggleSelectAll={toggleSelectAll}
      />

      <AdminEventsBulkBar
        selectedCount={selectedLoadedIds.length}
        selectedDraftCount={selectedDraftIds.length}
        isStatusPending={batchUpdateStatusMutation.isPending}
        isDeletePending={deleteEventsMutation.isPending}
        onPublish={() => batchUpdateStatus("published")}
        onReject={() => batchUpdateStatus("rejected")}
        onDelete={deleteSelectedEvents}
        onClear={clearSelectedIds}
      />

      <AdminEventsList
        events={events}
        selectedIds={selectedIds}
        statusConfig={STATUS_CONFIG}
        cities={cities}
        queryState={{
          hasNextPage,
          isLoading: isEventListLoading,
          isError: isEventListError,
          error: eventListError,
          isFetchingNextPage: isFetchingNext,
        }}
        onFetchNextPage={fetchNextPage}
        onRetry={() => {
          void refetchEvents()
        }}
        onToggleSelect={toggleSelectedId}
        onOpenReview={(event) => {
          setSelectedEventId(event.id)
        }}
        onUpdateStatus={updateStatus}
      />

      <AdminEventReviewSection onUpdateStatus={updateStatus} />
    </div>
  )
}
