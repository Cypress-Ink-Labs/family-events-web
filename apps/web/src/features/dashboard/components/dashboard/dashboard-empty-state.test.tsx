// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { DashboardEmptyState } from "./dashboard-empty-state"

function renderEmptyState(props: Parameters<typeof DashboardEmptyState>[0] = {}) {
  return render(
    <MemoryRouter>
      <DashboardEmptyState {...props} />
    </MemoryRouter>
  )
}

afterEach(() => {
  cleanup()
})

describe("DashboardEmptyState", () => {
  it("shows city-empty copy when a city is selected", () => {
    renderEmptyState({ hasCitySelected: true })

    expect(screen.getByText("No events yet in this city")).toBeDefined()
    expect(screen.getByRole("link", { name: "Change city" })).toBeDefined()
  })

  it("shows choose-a-city copy when no city is selected", () => {
    renderEmptyState({ hasCitySelected: false })

    expect(screen.getByText("Choose a city to start discovering events")).toBeDefined()
    expect(screen.getByRole("link", { name: "Choose city" })).toBeDefined()
  })

  it("defaults to the city-selected copy", () => {
    renderEmptyState()

    expect(screen.getByText("No events yet in this city")).toBeDefined()
  })

  it("always links to explore", () => {
    renderEmptyState({ hasCitySelected: false })

    expect(screen.getByRole("link", { name: "Explore" })).toBeDefined()
  })
})
