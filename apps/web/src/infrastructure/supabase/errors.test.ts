import { beforeEach, describe, expect, it, vi } from "vitest"
import { humanizeSupabaseError } from "./errors"

const { captureException, setTag, setContext } = vi.hoisted(() => ({
  captureException: vi.fn(),
  setTag: vi.fn(),
  setContext: vi.fn(),
}))

vi.mock("@/infrastructure/observability/sentry", () => ({
  Sentry: {
    withScope(callback: (scope: { setTag: typeof setTag; setContext: typeof setContext }) => void) {
      callback({ setTag, setContext })
    },
    captureException,
  },
}))

describe("humanizeSupabaseError", () => {
  beforeEach(() => {
    captureException.mockReset()
    setTag.mockReset()
    setContext.mockReset()
  })

  it("keeps already human-friendly messages", () => {
    expect(humanizeSupabaseError(new Error("Name and URL are required"), "Fallback")).toBe(
      "Name and URL are required"
    )
  })

  it("maps permission errors to a friendly message", () => {
    expect(
      humanizeSupabaseError(
        { message: 'new row violates row-level security policy for table "events"', code: "42501" },
        "Fallback"
      )
    ).toBe("You do not have permission to do that.")
  })

  it("maps duplicate key errors to a friendly message", () => {
    expect(
      humanizeSupabaseError(
        { message: "duplicate key value violates unique constraint", code: "23505" },
        "Fallback"
      )
    ).toBe("That already exists.")
  })

  it("maps auth credential errors to a friendly message", () => {
    expect(
      humanizeSupabaseError(
        { message: "Invalid login credentials", code: "invalid_credentials", status: 400 },
        "Fallback"
      )
    ).toBe("Email or password is incorrect.")
  })

  it("maps network failures to a friendly message", () => {
    expect(humanizeSupabaseError(new TypeError("Failed to fetch"), "Fallback")).toBe(
      "Unable to reach the server. Check your connection and try again."
    )
  })

  it("falls back when no message is available", () => {
    expect(humanizeSupabaseError(null, "Fallback")).toBe("Fallback")
  })

  it("captures the original error in sentry", () => {
    const error = Object.assign(new Error("duplicate key value violates unique constraint"), {
      code: "23505",
      status: 409,
    })

    humanizeSupabaseError(error, "Fallback")

    expect(captureException).toHaveBeenCalledWith(error)
    expect(setTag).toHaveBeenCalledWith("app.error_kind", "supabase")
    expect(setTag).toHaveBeenCalledWith("supabase.code", "23505")
    expect(setTag).toHaveBeenCalledWith("supabase.status", "409")
    expect(setContext).toHaveBeenCalledWith("supabase_error", {
      code: "23505",
      status: 409,
      message: "duplicate key value violates unique constraint",
      fallback: "Fallback",
    })
  })
})
