import { useMemo } from "react"
import { UNASSIGNED_CITY_KEY, type CityFilterValue } from "@/lib/events/group-by-city"
import type { Event } from "@/lib/types"

type EventStatusFilter = Event["status"] | "all"

interface FacetRow {
  status: string
  city_id: string | null
  count: number
}

/**
 * Derives status counts, city counts, and the "active total" (rows matching
 * both filters) from the raw admin-event facet rows returned by
 * `useAdminEventFacets`.
 *
 * Memoizes each derived value so re-renders of the parent page do not
 * recompute O(facets) work when filter state hasn't changed.
 */
export function useAdminEventFacetCounts({
  facets,
  statusFilter,
  cityFilter,
}: {
  facets: FacetRow[]
  statusFilter: EventStatusFilter
  cityFilter: CityFilterValue
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

  const activeTotal = useMemo(() => {
    return facets.reduce((acc, row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return acc
      if (cityFilter === "all") return acc + row.count
      if (cityFilter === UNASSIGNED_CITY_KEY) {
        return row.city_id === null ? acc + row.count : acc
      }
      return row.city_id === cityFilter ? acc + row.count : acc
    }, 0)
  }, [facets, statusFilter, cityFilter])

  return { statusCounts, statusTotal, cityCounts, cityTotal, activeTotal }
}
