// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { useRef as reactUseRef } from "react"
import type { MutableRefObject } from "react"
import type { EventWithDetails } from "@/shared/types"
import type { AdminEventEditSubmit } from "./admin-event-edit-form"
import { AdminEventEditForm } from "./admin-event-edit-form"

// ---------------------------------------------------------------------------
// Mock heavy UI sub-sections — the component test focuses on form wiring
// (dirty tracking + submit with changed-only patch), not field presentation.
// ---------------------------------------------------------------------------
vi.mock("@/features/admin/components/admin-event-edit-sections", () => ({
  AdminEventAiReference: () => null,
  AdminEventEditSection: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  FieldError: () => null,
}))

vi.mock("@/features/admin/components/admin-event-edit/basics-fields", () => ({
  AdminEventBasicsFields: ({ form }: { form: { register: (name: string) => object } }) => (
    <input
      data-testid="title-input"
      {...(form.register("title") as React.InputHTMLAttributes<HTMLInputElement>)}
    />
  ),
}))

vi.mock("@/features/admin/components/admin-event-edit/schedule-fields", () => ({
  AdminEventScheduleFields: () => null,
}))

vi.mock("@/features/admin/components/admin-event-edit/location-fields", () => ({
  AdminEventLocationFields: () => null,
}))

vi.mock("@/features/admin/components/admin-event-edit/audience-pricing-fields", () => ({
  AdminEventAudiencePricingFields: () => null,
}))

vi.mock("@/features/admin/components/admin-event-edit/media-fields", () => ({
  AdminEventMediaFields: () => null,
}))

vi.mock("@/features/admin/components/admin-event-edit/tags-field", () => ({
  AdminEventTagsField: () => null,
}))

vi.mock("@/features/admin/components/admin-event-edit/source-fields", () => ({
  AdminEventSourceFields: () => null,
}))

vi.mock("@/features/admin/components/admin-event-edit/visibility-fields", () => ({
  AdminEventVisibilityFields: () => null,
}))

vi.mock("@/features/admin/components/admin-event-edit/audit-summary", () => ({
  AdminEventAuditSummary: () => null,
}))

vi.mock("@/features/admin/components/admin-event-edit/save-bar", () => ({
  AdminEventSaveBar: () => (
    <button type="submit" data-testid="save-button">
      Save
    </button>
  ),
}))

vi.mock("@/features/admin/components/admin-event-edit/save-error-message", () => ({
  SaveErrorMessage: ({ message }: { message: string | null }) =>
    message ? <div data-testid="save-error">{message}</div> : null,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minimalEvent(overrides: Partial<EventWithDetails> = {}): EventWithDetails {
  return {
    id: "event-1",
    title: "Story Time",
    description: "Books for kids",
    start_datetime: "2026-06-01T15:00:00.000Z",
    end_datetime: null,
    timezone: "America/Chicago",
    venue_name: "Library",
    address: "1 Main St",
    city_id: "city-1",
    latitude: null,
    longitude: null,
    age_min: 2,
    age_max: 6,
    price: null,
    is_free: true,
    is_outdoor: null,
    source_url: "https://example.com/event",
    source_name: "Example",
    source_id: "source-1",
    images: [],
    status: "draft",
    ai_confidence: null,
    ai_tag_provider: null,
    ai_tag_model: null,
    ai_tag_status: null,
    submitted_by: null,
    recurrence_info: null,
    is_featured: false,
    view_count: 0,
    search_vector: null,
    admin_locked_fields: [],
    admin_last_edited_at: null,
    admin_last_edited_by: null,
    last_enrichment_attempt_at: null,
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z",
    tags: [],
    ...overrides,
  }
}

interface WrapperProps {
  event?: EventWithDetails
  onSubmit?: (input: AdminEventEditSubmit) => void
  saveError?: string | null
}

function FormWrapper({
  event = minimalEvent(),
  onSubmit = vi.fn(),
  saveError = null,
}: WrapperProps) {
  const dirtyRef = reactUseRef(false)

  return (
    <AdminEventEditForm
      event={event}
      cities={[]}
      sources={[]}
      tags={[]}
      trace={null}
      isTraceLoading={false}
      isSaving={false}
      isUnlocking={false}
      saveError={saveError}
      onSubmit={onSubmit}
      dirtyRef={dirtyRef}
      onUnlockFields={vi.fn()}
    />
  )
}

describe("AdminEventEditForm", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders with the event's initial title", () => {
    render(<FormWrapper />)

    const titleInput = screen.getByTestId("title-input") as HTMLInputElement
    expect(titleInput.value).toBe("Story Time")
  })

  it("calls onSubmit with a changed-only patch when the title is edited", async () => {
    const onSubmit = vi.fn()
    render(<FormWrapper onSubmit={onSubmit} />)

    const titleInput = screen.getByTestId("title-input") as HTMLInputElement

    // Change title
    fireEvent.change(titleInput, { target: { value: "Story Time Updated" } })

    // Submit the form
    fireEvent.click(screen.getByTestId("save-button"))

    // Wait for react-hook-form to process
    await new Promise((r) => setTimeout(r, 0))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const { patch } = onSubmit.mock.calls[0][0] as { patch: Record<string, unknown> }

    // Dirty tracking: only the changed field should be in the patch
    expect(patch.title).toBe("Story Time Updated")
    // Unchanged fields should NOT appear in a changed-only patch
    expect("description" in patch).toBe(false)
  })

  it("updates dirtyRef.current to true after editing a field", async () => {
    let capturedRef: MutableRefObject<boolean> | null = null

    function FormWithRefCapture() {
      const dirtyRef = reactUseRef(false)
      capturedRef = dirtyRef

      return (
        <AdminEventEditForm
          event={minimalEvent()}
          cities={[]}
          sources={[]}
          tags={[]}
          trace={null}
          isTraceLoading={false}
          isSaving={false}
          isUnlocking={false}
          saveError={null}
          onSubmit={vi.fn()}
          dirtyRef={dirtyRef}
          onUnlockFields={vi.fn()}
        />
      )
    }

    render(<FormWithRefCapture />)

    expect(capturedRef!.current).toBe(false)

    const titleInput = screen.getByTestId("title-input") as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: "Changed Title" } })

    // Allow react-hook-form useEffect to flush
    await new Promise((r) => setTimeout(r, 0))

    expect(capturedRef!.current).toBe(true)
  })

  it("displays a save error message when saveError prop is provided", () => {
    render(<FormWrapper saveError="Network error" />)

    expect(screen.getByTestId("save-error")).toHaveTextContent("Network error")
  })
})
