import { describe, expect, it } from "vitest"
import { filterByCity, groupByCity, UNASSIGNED_CITY_KEY } from "./group-by-city"
import type { City } from "@/shared/types"

function city(id: string, name: string): City {
  return {
    id,
    name,
    state: null,
    country: "US",
    slug: name.toLowerCase(),
    is_active: true,
    latitude: null,
    longitude: null,
    timezone: "America/New_York",
    created_at: "2026-01-01T00:00:00Z",
  }
}

const cities: City[] = [city("ny", "New York"), city("ch", "Chicago"), city("lv", "Louisville")]

describe("groupByCity", () => {
  it("seeds every city as a bucket so empty groups are renderable", () => {
    const groups = groupByCity<{ id: string; city_id: string | null }>([], cities)
    expect(groups.map((group) => group.key)).toEqual(["ch", "lv", "ny", UNASSIGNED_CITY_KEY])
    expect(groups.every((group) => group.items.length === 0)).toBe(true)
  })

  it("buckets nullable city_id into the Unassigned group", () => {
    const items = [
      { id: "a", city_id: "ny" },
      { id: "b", city_id: null },
      { id: "c", city_id: "ny" },
    ]
    const groups = groupByCity(items, cities)
    const ny = groups.find((group) => group.key === "ny")
    const unassigned = groups.find((group) => group.key === UNASSIGNED_CITY_KEY)
    expect(ny?.items.map((item) => item.id)).toEqual(["a", "c"])
    expect(unassigned?.items.map((item) => item.id)).toEqual(["b"])
  })

  it("keeps orphan rows whose city_id no longer matches an active city", () => {
    const items = [{ id: "x", city_id: "deleted-city-id" }]
    const groups = groupByCity(items, cities)
    const orphan = groups.find((group) => group.key === "deleted-city-id")
    expect(orphan).toBeDefined()
    expect(orphan?.label).toBe("Unassigned")
    expect(orphan?.items).toHaveLength(1)
  })

  it("sorts Unassigned last", () => {
    const groups = groupByCity<{ id: string; city_id: string | null }>([], cities)
    expect(groups[groups.length - 1].key).toBe(UNASSIGNED_CITY_KEY)
  })
})

describe("filterByCity", () => {
  const items = [
    { id: "a", city_id: "ny" },
    { id: "b", city_id: null },
    { id: "c", city_id: "ch" },
  ]

  it("returns everything for 'all'", () => {
    expect(filterByCity(items, "all")).toHaveLength(3)
  })

  it("filters by city id", () => {
    expect(filterByCity(items, "ny").map((item) => item.id)).toEqual(["a"])
  })

  it("filters unassigned via the sentinel key", () => {
    expect(filterByCity(items, UNASSIGNED_CITY_KEY).map((item) => item.id)).toEqual(["b"])
  })
})
