import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { useAdminStore } from "@/features/admin/stores/admin-store"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import { AdminEventsList } from "@/features/admin/components/admin-events-list"
import {
  AdminEventsBulkBar,
  AdminLlmReviewFilterBar,
  AdminEventsToolbar,
  AdminEventStatusFilterBar,
  type AdminLlmReviewFilter,
} from "@/features/admin/components/admin-events-sections"
import { AdminCityFilterBar } from "@/features/admin/components/admin-city-filter-bar"
import { AdminEventReviewSection } from "@/features/admin/components/admin-events/review-section"
import {
  useAdminEventFacets,
  useAdminEventsInfinite,
  useBatchUpdateAdminEventStatus,
  useDeleteAdminEvents,
  useUpdateAdminEventStatus,
} from "@/features/admin/hooks/events/use-admin-events"
import { useAdminEventFacetCounts } from "@/features/admin/hooks/events/use-admin-event-facet-counts"
import { useAdminCities } from "@/features/admin/hooks/use-admin-cities"
import { useCityFilter } from "@/features/admin/hooks/use-city-filter"
import { ADMIN_EVENT_STATUS_DISPLAY } from "@/features/admin/constants/event-status-display"
import {
  ADMIN_EVENTS_PAGE_SIZE_OPTIONS,
  ADMIN_EVENTS_PAGE_SIZE_STORAGE_KEY,
  ADMIN_PAGE_SIZE,
  type AdminEventsPageSize,
} from "@/shared/constants/pagination"
import type { Event } from "@/shared/types"

type EventStatusFilter = Event["status"] | "all"

function readStoredPageSize(): AdminEventsPageSize {
  if (typeof window === "undefined") return ADMIN_PAGE_SIZE as AdminEventsPageSize
  const raw = window.localStorage.getItem(ADMIN_EVENTS_PAGE_SIZE_STORAGE_KEY)
  const parsed = raw ? Number(raw) : NaN
  return (ADMIN_EVENTS_PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? (parsed as AdminEventsPageSize)
    : (ADMIN_PAGE_SIZE as AdminEventsPageSize)
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
  const [pageSize, setPageSize] = useState<AdminEventsPageSize>(readStoredPageSize)

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(ADMIN_EVENTS_PAGE_SIZE_STORAGE_KEY, String(pageSize))
  }, [pageSize])

  const handlePageSizeChange = useCallback(
    (nextSize: AdminEventsPageSize) => {
      setPageSize(nextSize)
      clearSelectedIds()
    },
    [clearSelectedIds]
  )

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
  } = useAdminEventsInfinite({
    keyword,
    status: statusFilter,
    cityFilter,
    llmReviewFilter,
    pageSize,
  })

  const events = useMemo(() => eventList?.events ?? [], [eventList?.events])
  const loadedCount = eventList?.loadedCount ?? 0
  const totalCount = eventList?.totalCount ?? 0
  const hasNextPage = eventList?.hasNextPage ?? listHasNextPage
  const isFetchingNext = eventList?.isFetchingNextPage ?? isFetchingNextPage

  const { data: facets = [] } = useAdminEventFacets(keyword)
  const { data: cities = [] } = useAdminCities()

  const { statusCounts, statusTotal, cityCounts, cityTotal, activeTotal } =
    useAdminEventFacetCounts({ facets, statusFilter, cityFilter })

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
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
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
        statusConfig={ADMIN_EVENT_STATUS_DISPLAY}
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
