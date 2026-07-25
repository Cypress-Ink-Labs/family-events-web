// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

const { useAdminCommentsMock, updateCommentMock, deleteCommentMock, toastErrorMock } = vi.hoisted(
  () => ({
    useAdminCommentsMock: vi.fn(),
    updateCommentMock: vi.fn(),
    deleteCommentMock: vi.fn(),
    toastErrorMock: vi.fn(),
  })
)

vi.mock("@/features/admin/hooks/use-admin-comments", () => ({
  useAdminComments: useAdminCommentsMock,
  useUpdateAdminComment: () => ({ mutateAsync: updateCommentMock }),
  useDeleteAdminComment: () => ({ mutateAsync: deleteCommentMock }),
}))
vi.mock("@/features/admin/hooks/use-admin-toast", () => ({
  useAdminToast: () => ({ toastError: toastErrorMock }),
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
  toast: Object.assign(vi.fn(), { success: vi.fn() }),
}))

import { AdminCommentsPage } from "./admin-comments"

const pageOneRows = [
  {
    id: "comment-page-1",
    body: "First page comment",
    is_approved: false,
    is_flagged: false,
    created_at: "2026-07-24T12:00:00.000Z",
    user_profiles: { display_name: "Ada" },
    events: { title: "Library" },
  },
]
const pageTwoRows = [
  {
    id: "comment-page-2-newest",
    body: "Newest page two comment",
    is_approved: true,
    is_flagged: false,
    created_at: "2026-07-23T12:00:00.000Z",
    user_profiles: { display_name: "Bea" },
    events: { title: "Park" },
  },
  {
    id: "comment-page-2-older",
    body: "Older page two comment",
    is_approved: true,
    is_flagged: false,
    created_at: "2026-07-22T12:00:00.000Z",
    user_profiles: { display_name: "Cal" },
    events: { title: "Museum" },
  },
]
const flaggedRows = [
  {
    id: "flagged-comment",
    body: "Flagged comment",
    is_approved: false,
    is_flagged: true,
    created_at: "2026-07-24T11:00:00.000Z",
    user_profiles: { display_name: "Dee" },
    events: { title: "Zoo" },
  },
]

beforeEach(() => {
  useAdminCommentsMock.mockImplementation((page: number, filter: string) => ({
    data:
      filter === "flagged"
        ? { rows: flaggedRows, totalCount: 1 }
        : page === 1
          ? { rows: pageTwoRows, totalCount: 101 }
          : { rows: pageOneRows, totalCount: 101 },
  }))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("AdminCommentsPage", () => {
  it("renders server-ordered page-two rows and resets to page zero when a filter changes", async () => {
    render(<AdminCommentsPage />)

    expect(useAdminCommentsMock).toHaveBeenLastCalledWith(0, "all")
    expect(screen.getByText("Page 1 of 3")).toBeDefined()

    fireEvent.click(screen.getByRole("button", { name: "Next" }))

    await waitFor(() => expect(useAdminCommentsMock).toHaveBeenLastCalledWith(1, "all"))
    expect(screen.getByText("Page 2 of 3")).toBeDefined()
    expect(screen.getByText("Newest page two comment")).toBeDefined()
    expect(screen.getByText("Older page two comment")).toBeDefined()
    const renderedText = document.body.textContent ?? ""
    expect(renderedText.indexOf("Newest page two comment")).toBeLessThan(
      renderedText.indexOf("Older page two comment")
    )

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Flagged" }), {
      button: 0,
      ctrlKey: false,
    })

    await waitFor(() => expect(useAdminCommentsMock).toHaveBeenLastCalledWith(0, "flagged"))
    expect(screen.getByText("Page 1 of 1")).toBeDefined()
    expect(screen.getByText("Flagged comment")).toBeDefined()
  })
})
