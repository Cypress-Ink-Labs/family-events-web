import { describe, expect, it } from "vitest"
import { safeHref, safeImageSrc } from "./safe-url"

describe("safeHref", () => {
  it("returns # for null/undefined/empty", () => {
    expect(safeHref(null)).toBe("#")
    expect(safeHref(undefined)).toBe("#")
    expect(safeHref("")).toBe("#")
  })

  it("returns # for javascript: scheme", () => {
    expect(safeHref("javascript:alert(1)")).toBe("#")
    expect(safeHref("JavaScript:alert(1)")).toBe("#")
    expect(safeHref("  javascript:alert(1)  ")).toBe("#")
  })

  it("returns # for data: scheme", () => {
    expect(safeHref("data:text/html,<script>alert(1)</script>")).toBe("#")
  })

  it("returns # for file: and other unsafe schemes", () => {
    expect(safeHref("file:///etc/passwd")).toBe("#")
    expect(safeHref("vbscript:msgbox(1)")).toBe("#")
  })

  it("returns # for non-URL strings", () => {
    expect(safeHref("not a url")).toBe("#")
    expect(safeHref("///example.com")).toBe("#")
  })

  it("preserves http and https URLs", () => {
    expect(safeHref("http://example.com")).toBe("http://example.com")
    expect(safeHref("https://example.com/path?q=1")).toBe("https://example.com/path?q=1")
  })

  it("preserves mailto and tel", () => {
    expect(safeHref("mailto:hello@example.com")).toBe("mailto:hello@example.com")
    expect(safeHref("tel:+15555550100")).toBe("tel:+15555550100")
  })
})

describe("safeImageSrc", () => {
  it("returns undefined for null/empty", () => {
    expect(safeImageSrc(null)).toBeUndefined()
    expect(safeImageSrc(undefined)).toBeUndefined()
    expect(safeImageSrc("")).toBeUndefined()
  })

  it("returns undefined for javascript:/data: schemes", () => {
    expect(safeImageSrc("javascript:alert(1)")).toBeUndefined()
    expect(safeImageSrc("data:image/png;base64,...")).toBeUndefined()
  })

  it("returns undefined for non-URL strings", () => {
    expect(safeImageSrc("not a url")).toBeUndefined()
  })

  it("preserves http and https URLs", () => {
    expect(safeImageSrc("https://example.com/img.png")).toBe("https://example.com/img.png")
    expect(safeImageSrc("http://example.com/img.png")).toBe("http://example.com/img.png")
  })
})
