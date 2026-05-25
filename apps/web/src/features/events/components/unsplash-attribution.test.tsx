import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { findUnsplashAttribution, UnsplashAttribution } from "./unsplash-attribution"
import type { UnsplashImageAttribution } from "@/shared/types"

const attribution: UnsplashImageAttribution = {
  provider: "unsplash",
  image_url: "https://images.unsplash.com/photo.jpg",
  matched_tag: "museum",
  photo_id: "abc",
  photographer_name: "Jane Doe",
  photographer_username: "jane",
  photographer_profile_url: "https://unsplash.com/@jane",
  photo_url: "https://unsplash.com/photos/abc",
}

describe("findUnsplashAttribution", () => {
  it("matches attribution by rendered image URL", () => {
    expect(findUnsplashAttribution([attribution], attribution.image_url)).toBe(attribution)
  })

  it("returns null when the image URL was not sourced from Unsplash", () => {
    expect(findUnsplashAttribution([attribution], "https://example.com/other.jpg")).toBeNull()
  })
})

describe("UnsplashAttribution", () => {
  it("renders required photographer and Unsplash links", () => {
    const html = renderToStaticMarkup(
      <UnsplashAttribution attribution={attribution} imageUrl={attribution.image_url} />
    )

    expect(html).toContain("Photo by")
    expect(html).toContain("Jane Doe")
    expect(html).toContain("https://unsplash.com/@jane")
    expect(html).toContain("https://unsplash.com/photos/abc")
    expect(html).toContain("Unsplash")
  })

  it("renders nothing when attribution does not match the image", () => {
    const html = renderToStaticMarkup(
      <UnsplashAttribution attribution={attribution} imageUrl="https://example.com/other.jpg" />
    )

    expect(html).toBe("")
  })
})
