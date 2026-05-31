import { describe, it, expect } from "vitest"
import { FeatureErrorBoundary } from "./feature-error-boundary"

// ---------------------------------------------------------------------------
// Tests for FeatureErrorBoundary in a Node (no-DOM) environment.
// We validate the class contract: getDerivedStateFromError returns the
// correct state shape, and the class exists as a proper React error boundary.
// ---------------------------------------------------------------------------

describe("FeatureErrorBoundary", () => {
  it("exports a class component", () => {
    expect(typeof FeatureErrorBoundary).toBe("function")
    // React class components have a prototype with render
    expect(typeof FeatureErrorBoundary.prototype.render).toBe("function")
  })

  it("has getDerivedStateFromError that returns error state", () => {
    const error = new Error("Test crash")
    const state = FeatureErrorBoundary.getDerivedStateFromError(error)

    expect(state).toEqual({
      hasError: true,
      errorMessage: "Test crash",
    })
  })

  it("captures error messages with special characters", () => {
    const error = new Error("Cannot read properties of undefined (reading 'map')")
    const state = FeatureErrorBoundary.getDerivedStateFromError(error)

    expect(state.hasError).toBe(true)
    expect(state.errorMessage).toBe("Cannot read properties of undefined (reading 'map')")
  })

  it("handles errors with empty messages", () => {
    const error = new Error("")
    const state = FeatureErrorBoundary.getDerivedStateFromError(error)

    expect(state.hasError).toBe(true)
    expect(state.errorMessage).toBe("")
  })

  it("has componentDidCatch method for error logging", () => {
    expect(typeof FeatureErrorBoundary.prototype.componentDidCatch).toBe("function")
  })
})
