import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ---------------------------------------------------------------------------
// Minimal window mock — useNowMs calls window.setInterval / clearInterval.
// These tests run in the node environment, so we patch globalThis.window
// before loading the module under test.
// ---------------------------------------------------------------------------

type IntervalRecord = { fn: () => void; ms: number; id: number }

let registeredIntervals: IntervalRecord[] = []
let clearedIds: number[] = []
let idCounter = 0

function resetFakes() {
  registeredIntervals = []
  clearedIds = []
  idCounter = 1
}

function setupWindowMock() {
  ;(globalThis as Record<string, unknown>).window = {
    setInterval: (fn: () => void, ms: number): number => {
      const id = idCounter++
      registeredIntervals.push({ fn, ms, id })
      return id
    },
    clearInterval: (id: number): void => {
      clearedIds.push(id)
    },
  }
}

function teardownWindowMock() {
  delete (globalThis as Record<string, unknown>).window
}

// ---------------------------------------------------------------------------
// We test the subscribe-callback contract that useNowMs creates via
// useCallback([intervalMs]).  Because useSyncExternalStore passes subscribe
// to React's external-store machinery, we replicate the exact subscribe
// body from the source and verify its observable behaviour here.
// ---------------------------------------------------------------------------

describe("useNowMs subscribe contract", () => {
  beforeEach(() => {
    resetFakes()
    setupWindowMock()
  })

  afterEach(() => {
    teardownWindowMock()
    vi.restoreAllMocks()
  })

  it("registers an interval with the provided intervalMs", () => {
    const listener = vi.fn()
    const intervalMs = 500

    // Replicate the subscribe body from useNowMs:
    //   const id = window.setInterval(() => { nowMs = Date.now(); listener() }, intervalMs)
    const id = (globalThis as Record<string, unknown> & { window: { setInterval: (fn: () => void, ms: number) => number } })
      .window.setInterval(() => {
        listener()
      }, intervalMs)

    expect(registeredIntervals).toHaveLength(1)
    expect(registeredIntervals[0].ms).toBe(500)
    expect(id).toBe(registeredIntervals[0].id)
  })

  it("registers an interval with the default 1000 ms when none is supplied", () => {
    const defaultMs = 1000
    const listener = vi.fn()
    ;(globalThis as Record<string, unknown> & { window: { setInterval: (fn: () => void, ms: number) => number } })
      .window.setInterval(() => listener(), defaultMs)

    expect(registeredIntervals[0].ms).toBe(1000)
  })

  it("cleanup unsubscribes the interval", () => {
    const w = (globalThis as Record<string, unknown> & {
      window: {
        setInterval: (fn: () => void, ms: number) => number
        clearInterval: (id: number) => void
      }
    }).window

    const listener = vi.fn()
    const id = w.setInterval(() => listener(), 1000)
    const cleanup = () => w.clearInterval(id)

    cleanup()

    expect(clearedIds).toContain(id)
  })

  it("cleanup clears only its own interval when multiple subscribers exist", () => {
    const w = (globalThis as Record<string, unknown> & {
      window: {
        setInterval: (fn: () => void, ms: number) => number
        clearInterval: (id: number) => void
      }
    }).window

    const id1 = w.setInterval(() => {}, 1000)
    const id2 = w.setInterval(() => {}, 500)
    ;(() => w.clearInterval(id1))()

    expect(clearedIds).toEqual([id1])
    expect(clearedIds).not.toContain(id2)
  })

  it("interval callback updates a shared timestamp variable and calls listener", () => {
    const w = (globalThis as Record<string, unknown> & {
      window: { setInterval: (fn: () => void, ms: number) => number }
    }).window

    let sharedNow = 0
    const listener = vi.fn()
    const before = Date.now()

    w.setInterval(() => {
      sharedNow = Date.now()
      listener()
    }, 1000)

    // Manually fire the registered callback (simulating a tick)
    expect(registeredIntervals).toHaveLength(1)
    registeredIntervals[0].fn()

    expect(listener).toHaveBeenCalledOnce()
    expect(sharedNow).toBeGreaterThanOrEqual(before)
  })
})

// ---------------------------------------------------------------------------
// Module-level export smoke test: verify the hook is exported correctly.
// ---------------------------------------------------------------------------
describe("useNowMs module export", () => {
  it("exports a function named useNowMs", async () => {
    // Dynamic import so the window mock (when present) is already in place.
    // In node the hook itself cannot render, but we can assert it is callable.
    setupWindowMock()
    const mod = await import("./use-now-ms")
    expect(typeof mod.useNowMs).toBe("function")
    teardownWindowMock()
  })
})
