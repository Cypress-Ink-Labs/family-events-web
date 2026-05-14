import type { City } from "@/lib/types"
import type { CityFilterValue } from "@/features/admin/hooks/use-city-filter"

export const UNASSIGNED_CITY_KEY = "none"

export interface CityGroup<T> {
  key: string
  label: string
  city: City | null
  items: T[]
}

export function groupByCity<T extends { city_id: string | null }>(
  items: T[],
  cities: City[]
): CityGroup<T>[] {
  const cityById = new Map(cities.map((city) => [city.id, city]))
  const buckets = new Map<string, CityGroup<T>>()

  for (const city of cities) {
    buckets.set(city.id, { key: city.id, label: city.name, city, items: [] })
  }
  buckets.set(UNASSIGNED_CITY_KEY, {
    key: UNASSIGNED_CITY_KEY,
    label: "Unassigned",
    city: null,
    items: [],
  })

  for (const item of items) {
    const key = item.city_id ?? UNASSIGNED_CITY_KEY
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.items.push(item)
    } else {
      const city = item.city_id ? (cityById.get(item.city_id) ?? null) : null
      buckets.set(key, {
        key,
        label: city?.name ?? "Unassigned",
        city,
        items: [item],
      })
    }
  }

  return Array.from(buckets.values()).toSorted((a, b) => {
    if (a.key === UNASSIGNED_CITY_KEY) return 1
    if (b.key === UNASSIGNED_CITY_KEY) return -1
    return a.label.localeCompare(b.label)
  })
}

export function filterByCity<T extends { city_id: string | null }>(
  items: T[],
  filter: CityFilterValue
): T[] {
  if (filter === "all") return items
  if (filter === UNASSIGNED_CITY_KEY) return items.filter((item) => item.city_id === null)
  return items.filter((item) => item.city_id === filter)
}
