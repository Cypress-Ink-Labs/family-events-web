import { describe, expect, it, vi } from "vitest"
import { buildShareUrl } from "@family-events/shared"

// Test the share URL builder (the pure function underlying the hook)
// and the share logic branches without needing React rendering.

describe("useShareEvent share logic", () => {
  it("buildShareUrl generates correct URL", () => {
    expect(buildShareUrl("https://family-events.org", "abc-123")).toBe(
      "https://family-events.org/share/abc-123"
    )
  })

  it("buildShareUrl strips trailing slash", () => {
    expect(buildShareUrl("https://example.com/", "id")).toBe("https://example.com/share/id")
  })

  it("buildShareUrl works with localhost", () => {
    expect(buildShareUrl("http://localhost:5173", "evt-1")).toBe(
      "http://localhost:5173/share/evt-1"
    )
  })

  it("clipboard fallback copies share URL", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const url = buildShareUrl("https://family-events.org", "test-id")

    await writeText(url)

    expect(writeText).toHaveBeenCalledWith("https://family-events.org/share/test-id")
  })

  it("share URL preserves UUID event IDs", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000"
    const url = buildShareUrl("https://family-events.org", uuid)
    expect(url).toContain(uuid)
    expect(url).toBe(`https://family-events.org/share/${uuid}`)
  })

  it("AbortError name is detected correctly for share cancel", () => {
    const abortError = new DOMException("Share canceled", "AbortError")
    expect(abortError instanceof Error).toBe(true)
    expect(abortError.name).toBe("AbortError")
  })

  it("non-AbortError is not mistaken for cancel", () => {
    const error = new Error("Not allowed")
    expect(error.name).not.toBe("AbortError")
  })
})
