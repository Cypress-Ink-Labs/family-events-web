import { describe, expect, it } from "vitest"
import { buildProxyUrl, buildSrcSet, IMAGE_WIDTHS } from "./image-proxy"

const SAMPLE_URL = "https://images.unsplash.com/photo-123?auto=format&w=800"

describe("buildProxyUrl", () => {
  it("builds a wsrv.nl URL with encoded source, width, and webp", () => {
    const result = buildProxyUrl({ src: SAMPLE_URL, width: 600 })
    expect(result).not.toBeNull()
    const parsed = new URL(result!)
    expect(parsed.origin).toBe("https://wsrv.nl")
    expect(parsed.searchParams.get("url")).toBe(SAMPLE_URL)
    expect(parsed.searchParams.get("w")).toBe("600")
    expect(parsed.searchParams.get("output")).toBe("webp")
  })

  it("omits output param when format is auto", () => {
    const result = buildProxyUrl({ src: SAMPLE_URL, width: 300, format: "auto" })
    expect(result).not.toBeNull()
    const parsed = new URL(result!)
    expect(parsed.searchParams.has("output")).toBe(false)
  })

  it("returns null for non-http URLs", () => {
    expect(buildProxyUrl({ src: "ftp://files.example.com/img.png", width: 300 })).toBeNull()
    expect(buildProxyUrl({ src: "data:image/png;base64,abc", width: 300 })).toBeNull()
    expect(buildProxyUrl({ src: "", width: 300 })).toBeNull()
    expect(buildProxyUrl({ src: "not-a-url", width: 300 })).toBeNull()
  })

  it("handles http (non-https) URLs", () => {
    const result = buildProxyUrl({ src: "http://example.com/img.jpg", width: 300 })
    expect(result).not.toBeNull()
    expect(result).toContain("http%3A%2F%2Fexample.com")
  })

  it("uses custom proxyBaseUrl for self-hosted imgproxy", () => {
    const result = buildProxyUrl({
      src: SAMPLE_URL,
      width: 900,
      proxyBaseUrl: "https://imgproxy.example.com",
    })
    expect(result).not.toBeNull()
    expect(result).toContain("imgproxy.example.com")
    expect(result).toContain("resize:fit:900")
    expect(result).toContain("@webp")
  })

  it("handles trailing slash on custom proxy base URL", () => {
    const result = buildProxyUrl({
      src: SAMPLE_URL,
      width: 300,
      proxyBaseUrl: "https://imgproxy.example.com/",
    })
    expect(result).toMatch(/^https:\/\/imgproxy\.example\.com\/resize/)
    // No double slash
    expect(result).not.toContain("com//")
  })

  it("encodes special characters in source URL", () => {
    const weird = "https://example.com/my image (1).jpg?size=large&q=80"
    const result = buildProxyUrl({ src: weird, width: 300 })
    expect(result).not.toBeNull()
    // The source should be encoded in the query string
    const parsed = new URL(result!)
    expect(parsed.searchParams.get("url")).toBe(weird)
  })
})

describe("buildSrcSet", () => {
  it("generates entries for all standard widths", () => {
    const srcSet = buildSrcSet(SAMPLE_URL)
    expect(srcSet).toBeDefined()
    for (const w of IMAGE_WIDTHS) {
      expect(srcSet).toContain(`${w}w`)
    }
  })

  it("returns undefined for invalid URLs", () => {
    expect(buildSrcSet("not-a-url")).toBeUndefined()
    expect(buildSrcSet("")).toBeUndefined()
  })

  it("passes format option through to proxy URLs", () => {
    const srcSet = buildSrcSet(SAMPLE_URL, { format: "auto" })
    expect(srcSet).toBeDefined()
    // auto format omits &output= from wsrv.nl URLs
    expect(srcSet).not.toContain("output=")
  })

  it("passes custom proxyBaseUrl through", () => {
    const srcSet = buildSrcSet(SAMPLE_URL, {
      proxyBaseUrl: "https://imgproxy.test",
    })
    expect(srcSet).toBeDefined()
    expect(srcSet).toContain("imgproxy.test")
  })
})

describe("IMAGE_WIDTHS", () => {
  it("contains the expected breakpoints", () => {
    expect(IMAGE_WIDTHS).toEqual([300, 600, 900, 1200])
  })
})
