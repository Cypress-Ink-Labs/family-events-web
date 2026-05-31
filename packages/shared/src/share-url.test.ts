import { describe, expect, it } from "vitest"
import { buildShareUrl } from "./share-url"

describe("buildShareUrl", () => {
  it("builds correct share URL", () => {
    expect(buildShareUrl("https://family-events.org", "abc-123")).toBe(
      "https://family-events.org/share/abc-123"
    )
  })

  it("strips trailing slash from base URL", () => {
    expect(buildShareUrl("https://family-events.org/", "abc-123")).toBe(
      "https://family-events.org/share/abc-123"
    )
  })

  it("strips multiple trailing slashes", () => {
    expect(buildShareUrl("https://example.com///", "id")).toBe("https://example.com/share/id")
  })

  it("works with localhost", () => {
    expect(buildShareUrl("http://localhost:5173", "evt-1")).toBe(
      "http://localhost:5173/share/evt-1"
    )
  })

  it("preserves UUID event IDs", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000"
    expect(buildShareUrl("https://family-events.org", uuid)).toBe(
      `https://family-events.org/share/${uuid}`
    )
  })
})
