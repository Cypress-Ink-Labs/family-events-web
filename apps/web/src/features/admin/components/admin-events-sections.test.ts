import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { AdminEventsToolbar } from "./admin-events-sections"

describe("AdminEventsToolbar", () => {
  it("renders a single button for the select-all visible control", () => {
    const html = renderToStaticMarkup(
      createElement(AdminEventsToolbar, {
        keyword: "",
        onKeywordChange: vi.fn(),
        eventCount: 3,
        allVisibleSelected: false,
        onToggleSelectAll: vi.fn(),
      })
    )

    expect((html.match(/<button\b/g) ?? []).length).toBe(1)
    expect(html).toContain("Select all visible (3)")
  })
})
