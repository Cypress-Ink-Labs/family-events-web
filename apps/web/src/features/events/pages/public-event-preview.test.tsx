// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }))

vi.mock("@tanstack/react-query", () => ({ useQuery: useQueryMock }))
vi.mock("@/shared/hooks/use-document-title", () => ({ useDocumentTitle: vi.fn() }))
vi.mock("react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useParams: () => ({ eventId: "1b2c3d4e-5f60-4a71-8b92-c3d4e5f60718" }),
}))

import { PublicEventPreviewPage } from "./public-event-preview"

const EVENT = {
  id: "1b2c3d4e-5f60-4a71-8b92-c3d4e5f60718",
  title: "Park Playdate",
  description: null,
  start_datetime: null,
  venue_name: null,
}

function renderPreview(images: unknown) {
  useQueryMock.mockReturnValue({
    data: { ...EVENT, images },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })

  render(<PublicEventPreviewPage />)
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("PublicEventPreviewPage", () => {
  it("renders HTTPS hero images eagerly through the responsive proxy", () => {
    renderPreview(["https://images.example.com/park-playdate.jpg"])

    const image = screen.getByRole("img", { name: "Park Playdate" })
    expect(image).toHaveAttribute("loading", "eager")
    expect(image).toHaveAttribute("fetchpriority", "high")
    expect(image.getAttribute("srcset")).toContain("wsrv.nl")
  })

  it("renders the existing fallback when no valid image is available", () => {
    renderPreview([])

    expect(screen.getByRole("img", { name: "Park Playdate" })).toHaveAttribute(
      "src",
      "/og-fallback.png"
    )
  })
})
