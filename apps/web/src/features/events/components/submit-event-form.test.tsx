// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeAll } from "vitest"
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react"
import { SubmitEventForm } from "./submit-event-form"

// jsdom has no ResizeObserver; the Radix Switch (free/paid toggle) needs it.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

// A real UUID so the zod `city_id` check (z.string().uuid()) passes on the
// happy path. The form now runs on react-hook-form + zodResolver, so submit
// validation is async — tests flush the microtask queue after clicking submit.
const CITY_ID = "11111111-1111-4111-8111-111111111111"

// react-hook-form validates and resolves on submit asynchronously; let those
// promises settle before asserting on onSubmit / rendered errors.
function flush() {
  return new Promise((r) => setTimeout(r, 0))
}

function renderForm(overrides: Partial<React.ComponentProps<typeof SubmitEventForm>> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  const result = render(
    <SubmitEventForm cityId={CITY_ID} onSubmit={onSubmit} isSubmitting={false} {...overrides} />
  )
  return { onSubmit, ...result }
}

function fillRequiredFields(container: HTMLElement) {
  fireEvent.change(screen.getByPlaceholderText(/Neighborhood Playdate/i), {
    target: { value: "Park Playdate" },
  })
  const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement
  fireEvent.change(dateInput, { target: { value: "2026-07-01" } })
  const timeInputs = container.querySelectorAll('input[type="time"]')
  // First time input is the required Start Time; second is the optional End Time.
  fireEvent.change(timeInputs[0] as HTMLInputElement, { target: { value: "10:00" } })
}

function submitForm() {
  fireEvent.click(screen.getByRole("button", { name: /Submit Event for Review/i }))
  return flush()
}

afterEach(() => cleanup())

describe("SubmitEventForm", () => {
  it("calls onSubmit once with parsed form data when required fields are filled", async () => {
    const { onSubmit, container } = renderForm()

    fillRequiredFields(container)
    await submitForm()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Park Playdate",
        start_datetime: "2026-07-01T10:00:00",
        city_id: CITY_ID,
        is_free: true,
      })
    )
  })

  it("surfaces react-hook-form validation errors and does NOT call onSubmit when submitted empty", async () => {
    const { onSubmit } = renderForm()

    await submitForm()

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/Title must be at least 3 characters/i)).toBeInTheDocument()
    expect(screen.getByText(/Date and time required/i)).toBeInTheDocument()
  })

  it("blocks submission and surfaces a city_id error when no city is selected", async () => {
    const { onSubmit, container } = renderForm({ cityId: undefined })

    fillRequiredFields(container)
    await submitForm()

    // city_id is `z.string().uuid()`, so an undefined cityId fails the string
    // check first and renders the centered city_id error paragraph; the exact
    // copy is zod's invalid-type message ("expected string").
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/expected string/i)).toBeInTheDocument()
  })

  it("gates the price field behind the free/paid toggle and submits the entered price", async () => {
    const { onSubmit, container } = renderForm()

    // Free is the default: no price field rendered.
    expect(screen.queryByPlaceholderText("0.00")).toBeNull()

    // Toggle off "Free Event" to reveal the price field.
    fireEvent.click(screen.getByRole("switch"))
    const priceInput = screen.getByPlaceholderText("0.00")
    expect(priceInput).toBeInTheDocument()

    fillRequiredFields(container)
    fireEvent.change(priceInput, { target: { value: "12.50" } })
    await submitForm()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ is_free: false, price: 12.5 }))
  })

  it("renders the submitting state and disables the submit button", () => {
    renderForm({ isSubmitting: true })

    const button = screen.getByRole("button", { name: /Submitting/i })
    expect(button).toBeDisabled()
    expect(within(button).queryByText(/Submit Event for Review/i)).toBeNull()
  })
})
