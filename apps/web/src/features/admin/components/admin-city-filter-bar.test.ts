import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { AdminCityFilterBar } from "./admin-city-filter-bar"
import { UNASSIGNED_CITY_KEY } from "@/lib/group-by-city"
import type { City } from "@/lib/types"

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

describe("AdminCityFilterBar", () => {
  const cities: City[] = [city("ny", "New York"), city("ch", "Chicago")]

  it("renders an All chip plus one chip per city", () => {
    const html = renderToStaticMarkup(
      createElement(AdminCityFilterBar, {
        cities,
        counts: { ny: 4, ch: 1 },
        total: 5,
        value: "all",
        onChange: vi.fn(),
      })
    )
    expect((html.match(/<button\b/g) ?? []).length).toBe(3)
    expect(html).toContain("All")
    expect(html).toContain("New York")
    expect(html).toContain("Chicago")
    expect(html).toContain("(5)")
  })

  it("renders an Unassigned chip only when count > 0", () => {
    const withUnassigned = renderToStaticMarkup(
      createElement(AdminCityFilterBar, {
        cities,
        counts: { ny: 2, [UNASSIGNED_CITY_KEY]: 3 },
        total: 5,
        value: "all",
        onChange: vi.fn(),
      })
    )
    expect(withUnassigned).toContain("Unassigned")

    const withoutUnassigned = renderToStaticMarkup(
      createElement(AdminCityFilterBar, {
        cities,
        counts: { ny: 2 },
        total: 2,
        value: "all",
        onChange: vi.fn(),
      })
    )
    expect(withoutUnassigned).not.toContain("Unassigned")
  })

  it("shows zero counts for cities with no matching items", () => {
    const html = renderToStaticMarkup(
      createElement(AdminCityFilterBar, {
        cities,
        counts: { ny: 5 },
        total: 5,
        value: "all",
        onChange: vi.fn(),
      })
    )
    expect(html).toContain("Chicago")
    expect(html).toContain("(0)")
  })
})
