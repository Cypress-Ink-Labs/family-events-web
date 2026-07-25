// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

const { useAdminRatingsMock, deleteRatingMock, toastErrorMock } = vi.hoisted(() => ({
  useAdminRatingsMock: vi.fn(),
  deleteRatingMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock("@/features/admin/hooks/use-admin-ratings", () => ({
  useAdminRatings: useAdminRatingsMock,
  useDeleteAdminRating: () => ({ mutateAsync: deleteRatingMock }),
}))
vi.mock("@/features/admin/hooks/use-admin-toast", () => ({
  useAdminToast: () => ({ toastError: toastErrorMock }),
}))
vi.mock("@/features/events/components/star-rating", () => ({
  StarRating: () => <span>stars</span>,
}))
vi.mock("@/shared/components/client-date", () => ({
  ClientDate: () => <span>date</span>,
}))
vi.mock("@/components/v2", () => ({
  Toolbar: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div>{`${title}: ${subtitle}`}</div>
  ),
}))
vi.mock("sonner", () => ({
  toast: vi.fn(),
}))

import { AdminRatingsPage } from "./admin-ratings"

const pageOneRows = [
  {
    id: "rating-page-1",
    score: 4,
    created_at: "2026-07-24T12:00:00.000Z",
    user_profiles: { display_name: "Ada" },
    events: { title: "Library" },
  },
]
const pageTwoRows = [
  {
    id: "rating-page-2-newest",
    score: 5,
    created_at: "2026-07-23T12:00:00.000Z",
    user_profiles: { display_name: "Bea" },
    events: { title: "Park" },
  },
  {
    id: "rating-page-2-older",
    score: 3,
    created_at: "2026-07-22T12:00:00.000Z",
    user_profiles: { display_name: "Cal" },
    events: { title: "Museum" },
  },
]

beforeEach(() => {
  useAdminRatingsMock.mockImplementation((page: number) => ({
    data:
      page === 1 ? { rows: pageTwoRows, totalCount: 51 } : { rows: pageOneRows, totalCount: 51 },
  }))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("AdminRatingsPage", () => {
  it("requests and renders the second server page in newest-first row order", async () => {
    render(<AdminRatingsPage />)

    expect(useAdminRatingsMock).toHaveBeenLastCalledWith(0)
    expect(screen.getByText("Page 1 of 2")).toBeDefined()

    fireEvent.click(screen.getByRole("button", { name: "Next" }))

    await waitFor(() => expect(useAdminRatingsMock).toHaveBeenLastCalledWith(1))
    expect(screen.getByText("Page 2 of 2")).toBeDefined()
    expect(screen.getByText("Bea")).toBeDefined()
    expect(screen.getByText("Cal")).toBeDefined()
    const renderedText = document.body.textContent ?? ""
    expect(renderedText.indexOf("Bea")).toBeLessThan(renderedText.indexOf("Cal"))
  })
})
