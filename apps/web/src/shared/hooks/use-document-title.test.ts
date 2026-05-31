import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ---------------------------------------------------------------------------
// We test the useDocumentTitle logic by importing the module and calling
// the effect manually via React's useEffect contract: the callback sets the
// title, the cleanup restores the suffix. The vitest environment is Node (no
// real DOM), so we stub `document` at the global level.
// ---------------------------------------------------------------------------

// Minimal document stub for title
const titleStore = { value: "" }
vi.stubGlobal("document", {
  get title() {
    return titleStore.value
  },
  set title(v: string) {
    titleStore.value = v
  },
})

// Capture useEffect callbacks without rendering
const effectCallbacks: Array<() => (() => void) | void> = []
vi.mock("react", () => ({
  useEffect: (cb: () => (() => void) | void, _deps?: unknown[]) => {
    effectCallbacks.push(cb)
  },
}))

// Import after mocking
const { useDocumentTitle } = await import("./use-document-title")

describe("useDocumentTitle", () => {
  beforeEach(() => {
    titleStore.value = "Family Events"
    effectCallbacks.length = 0
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("sets document.title with the suffix pattern", () => {
    useDocumentTitle("Explore Events")

    // Run the captured useEffect callback
    const cleanup = effectCallbacks[0]()
    expect(document.title).toBe("Explore Events | Family Events")

    // Cleanup reverts to suffix
    if (typeof cleanup === "function") cleanup()
    expect(document.title).toBe("Family Events")
  })

  it("falls back to just the suffix when title is undefined", () => {
    useDocumentTitle(undefined)

    const cleanup = effectCallbacks[0]()
    expect(document.title).toBe("Family Events")

    if (typeof cleanup === "function") cleanup()
    expect(document.title).toBe("Family Events")
  })

  it("falls back to just the suffix when title is empty string", () => {
    useDocumentTitle("")

    const cleanup = effectCallbacks[0]()
    expect(document.title).toBe("Family Events")

    if (typeof cleanup === "function") cleanup()
    expect(document.title).toBe("Family Events")
  })

  it("handles a dynamic title like an event name", () => {
    useDocumentTitle("Summer Festival 2026")

    const cleanup = effectCallbacks[0]()
    expect(document.title).toBe("Summer Festival 2026 | Family Events")

    if (typeof cleanup === "function") cleanup()
    expect(document.title).toBe("Family Events")
  })
})
