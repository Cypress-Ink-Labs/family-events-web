// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react"
import type { CommunityEventFormData } from "@/features/events/components/submit-event-form"

// vi.hoisted so the vi.mock factories (hoisted to the top of the file) can
// reference these spies; plain top-level consts would not yet be initialized.
const { rpc, navigate, authMock, appMock, toastSuccess, toastError } = vi.hoisted(() => ({
  rpc: vi.fn(),
  navigate: vi.fn(),
  authMock: vi.fn(),
  appMock: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock("@/infrastructure/supabase/client", () => ({ supabase: { rpc } }))
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }))
vi.mock("@/features/auth/stores/auth-store", () => ({ useAuth: () => authMock() }))
vi.mock("@/app/stores/app-store", () => ({ useApp: () => appMock() }))
vi.mock("@/shared/hooks/use-document-title", () => ({ useDocumentTitle: vi.fn() }))

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return {
    ...actual,
    useNavigate: () => navigate,
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  }
})

// Replace the form with a thin stub: a button that calls the page's onSubmit
// with a fully-populated payload, plus one with the optional fields empty so we
// can assert the `|| undefined` / `?? undefined` mapping the page applies.
const FULL_DATA: CommunityEventFormData = {
  title: "Park Playdate",
  description: "Bring snacks",
  start_datetime: "2026-07-01T10:00:00",
  end_datetime: "2026-07-01T12:00:00",
  venue_name: "Moncus Park",
  address: "123 Main St",
  city_id: "city-1",
  age_min: 2,
  age_max: 6,
  is_free: false,
  price: 15,
}

vi.mock("@/features/events/components/submit-event-form", () => ({
  SubmitEventForm: ({
    onSubmit,
    isSubmitting,
  }: {
    onSubmit: (data: CommunityEventFormData) => Promise<void>
    isSubmitting: boolean
  }) => (
    <button type="button" disabled={isSubmitting} onClick={() => void onSubmit(FULL_DATA)}>
      stub-submit
    </button>
  ),
}))

import { SubmitEventPage } from "./submit-event"

beforeEach(() => {
  authMock.mockReturnValue({ user: { id: "user-1" } })
  appMock.mockReturnValue({ selectedCity: { id: "city-1" } })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("SubmitEventPage", () => {
  it("calls submit_community_event with the mapped p_* payload and navigates on success", async () => {
    rpc.mockResolvedValue({ error: null })

    render(<SubmitEventPage />)
    fireEvent.click(screen.getByRole("button", { name: "stub-submit" }))

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))

    expect(rpc).toHaveBeenCalledWith("submit_community_event", {
      p_title: "Park Playdate",
      p_description: "Bring snacks",
      p_start_datetime: "2026-07-01T10:00:00",
      p_end_datetime: "2026-07-01T12:00:00",
      p_venue_name: "Moncus Park",
      p_address: "123 Main St",
      p_city_id: "city-1",
      p_age_min: 2,
      p_age_max: 6,
      p_is_free: false,
      p_price: 15,
    })

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled())
    expect(navigate).toHaveBeenCalledWith("/explore")
    expect(toastError).not.toHaveBeenCalled()
  })

  it("shows an error toast and does NOT navigate when the RPC returns an error", async () => {
    rpc.mockResolvedValue({ error: { message: "boom" } })

    render(<SubmitEventPage />)
    fireEvent.click(screen.getByRole("button", { name: "stub-submit" }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())

    expect(navigate).not.toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it("does not call the RPC and warns when the user is not signed in", () => {
    authMock.mockReturnValue({ user: null })

    render(<SubmitEventPage />)
    fireEvent.click(screen.getByRole("button", { name: "stub-submit" }))

    expect(rpc).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith("Please sign in to submit an event")
    expect(navigate).not.toHaveBeenCalled()
  })
})
