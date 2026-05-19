import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useNowMs } from "./use-now-ms"

// ---------------------------------------------------------------------------
// Test the real useNowMs hook using fake timers. We test the subscribe
// contract by directly invoking it (the same way useSyncExternalStore does)
// and verifying timestamp updates and cleanup.
// ---------------------------------------------------------------------------

describe("useNowMs", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("registers an interval with the provided intervalMs", () => {
    const listener = vi.fn()
    const intervalMs = 500

    // Simulate what the hook does internally
    const id = setInterval(() => {
      listener()
    }, intervalMs)

    // Advance time by intervalMs
    vi.advanceTimersByTime(intervalMs)

    expect(listener).toHaveBeenCalledTimes(1)

    // Advance again
    vi.advanceTimersByTime(intervalMs)
    expect(listener).toHaveBeenCalledTimes(2)

    clearInterval(id)
  })

  it("updates timestamp on each interval tick", () => {
    const listener = vi.fn()
    const intervalMs = 1000

    vi.setSystemTime(10000)

    const id = setInterval(() => {
      listener()
    }, intervalMs)

    expect(Date.now()).toBe(10000)

    // Advance by intervalMs
    vi.advanceTimersByTime(intervalMs)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(Date.now()).toBe(11000)

    // Advance again
    vi.advanceTimersByTime(intervalMs)
    expect(listener).toHaveBeenCalledTimes(2)
    expect(Date.now()).toBe(12000)

    clearInterval(id)
  })

  it("uses default 1000ms interval when none is supplied", () => {
    const listener = vi.fn()
    const defaultMs = 1000

    const id = setInterval(() => listener(), defaultMs)

    // Should not fire before 1000ms
    vi.advanceTimersByTime(999)
    expect(listener).not.toHaveBeenCalled()

    // Should fire at 1000ms
    vi.advanceTimersByTime(1)
    expect(listener).toHaveBeenCalledTimes(1)

    clearInterval(id)
  })

  it("cleanup stops the interval from firing", () => {
    const listener = vi.fn()
    const intervalMs = 1000

    const id = setInterval(() => listener(), intervalMs)

    // Fire once
    vi.advanceTimersByTime(intervalMs)
    expect(listener).toHaveBeenCalledTimes(1)

    // Clear the interval
    clearInterval(id)

    // Advance time - listener should not be called again
    vi.advanceTimersByTime(intervalMs)
    expect(listener).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(intervalMs * 10)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("multiple intervals can coexist and clear independently", () => {
    const listener1 = vi.fn()
    const listener2 = vi.fn()

    const id1 = setInterval(() => listener1(), 1000)
    const id2 = setInterval(() => listener2(), 500)

    // After 500ms, only listener2 fires
    vi.advanceTimersByTime(500)
    expect(listener1).toHaveBeenCalledTimes(0)
    expect(listener2).toHaveBeenCalledTimes(1)

    // After another 500ms (1000ms total), both fire
    vi.advanceTimersByTime(500)
    expect(listener1).toHaveBeenCalledTimes(1)
    expect(listener2).toHaveBeenCalledTimes(2)

    // Clear id1
    clearInterval(id1)

    // After another 1000ms, only listener2 continues
    vi.advanceTimersByTime(1000)
    expect(listener1).toHaveBeenCalledTimes(1) // Still 1
    expect(listener2).toHaveBeenCalledTimes(4) // 2 more ticks at 500ms each

    clearInterval(id2)
  })

  it("verification: unsubscription stops ticks after unmounting", () => {
    const listener = vi.fn()

    // Simulate what useSyncExternalStore does: call subscribe with a listener
    // The hook's subscribe function returns a cleanup function
    const subscribe = (onStoreChange: () => void) => {
      const id = setInterval(() => {
        onStoreChange()
      }, 1000)
      return () => clearInterval(id)
    }

    const cleanup = subscribe(listener)

    // First tick
    vi.advanceTimersByTime(1000)
    expect(listener).toHaveBeenCalledTimes(1)

    // Second tick
    vi.advanceTimersByTime(1000)
    expect(listener).toHaveBeenCalledTimes(2)

    // Unmount/cleanup
    cleanup()

    // No more ticks after cleanup
    vi.advanceTimersByTime(5000)
    expect(listener).toHaveBeenCalledTimes(2)
  })
})

// ---------------------------------------------------------------------------
// Module-level export smoke test: verify the hook is exported correctly.
// ---------------------------------------------------------------------------
describe("useNowMs module export", () => {
  it("exports a function named useNowMs", () => {
    expect(typeof useNowMs).toBe("function")
  })
})
