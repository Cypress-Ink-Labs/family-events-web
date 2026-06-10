import { useMemo } from "react"
import { UNASSIGNED_CITY_KEY, type CityFilterValue } from "@/lib/events/group-by-city"
import type { Event } from "@/shared/types"

type EventStatusFilter = Event["status"] | "all"

interface FacetRow {
  status: string
  city_id: string | null
  source_id: string | null
  count: number
}

/**
 * Derives status counts, city counts, source counts, and the active total
 * from the raw admin-event facet rows returned by
 * `useAdminEventFacets`.
 *
 * Memoizes each derived value so re-renders of the parent page do not
 * recompute O(facets) work when filter state hasn't changed.
 */
export function useAdminEventFacetCounts({
  facets,
  statusFilter,
  cityFilter,
  sourceFilter,
}: {
  facets: FacetRow[]
  statusFilter: EventStatusFilter
  cityFilter: CityFilterValue
  sourceFilter: string
}) {
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const row of facets) {
      const matchesCity =
        cityFilter === "all"
          ? true
          : cityFilter === UNASSIGNED_CITY_KEY
            ? row.city_id === null
            : row.city_id === cityFilter
      const matchesSource = sourceFilter === "all" ? true : row.source_id === sourceFilter
      if (!matchesCity) continue
      if (!matchesSource) continue
      counts[row.status] = (counts[row.status] ?? 0) + row.count
    }
    return counts
  }, [cityFilter, facets, sourceFilter])

  const statusTotal = useMemo(
    () => Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
    [statusCounts]
  )

  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const row of facets) {
      if (statusFilter !== "all" && row.status !== statusFilter) continue
      if (sourceFilter !== "all" && row.source_id !== sourceFilter) continue
      const key = row.city_id ?? UNASSIGNED_CITY_KEY
      counts[key] = (counts[key] ?? 0) + row.count
    }
    return counts
  }, [facets, sourceFilter, statusFilter])

  const cityTotal = useMemo(
    () => Object.values(cityCounts).reduce((sum, count) => sum + count, 0),
    [cityCounts]
  )

  const activeTotal = useMemo(() => {
    return facets.reduce((acc, row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return acc
      if (sourceFilter !== "all" && row.source_id !== sourceFilter) return acc
      if (cityFilter === "all") return acc + row.count
      if (cityFilter === UNASSIGNED_CITY_KEY) {
        return row.city_id === null ? acc + row.count : acc
      }
      return row.city_id === cityFilter ? acc + row.count : acc
    }, 0)
  }, [facets, statusFilter, cityFilter, sourceFilter])

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const row of facets) {
      if (statusFilter !== "all" && row.status !== statusFilter) continue
      if (cityFilter === UNASSIGNED_CITY_KEY && row.city_id !== null) continue
      if (
        cityFilter !== "all" &&
        cityFilter !== UNASSIGNED_CITY_KEY &&
        row.city_id !== cityFilter
      ) {
        continue
      }
      if (!row.source_id) continue
      counts[row.source_id] = (counts[row.source_id] ?? 0) + row.count
    }
    return counts
  }, [facets, statusFilter, cityFilter])

  const sourceTotal = useMemo(() => {
    return facets.reduce((acc, row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return acc
      if (cityFilter === "all") return acc + row.count
      if (cityFilter === UNASSIGNED_CITY_KEY) {
        return row.city_id === null ? acc + row.count : acc
      }
      return row.city_id === cityFilter ? acc + row.count : acc
    }, 0)
  }, [facets, statusFilter, cityFilter])

  return {
    statusCounts,
    statusTotal,
    cityCounts,
    cityTotal,
    sourceCounts,
    sourceTotal,
    activeTotal,
  }
}
