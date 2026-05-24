import { describe, expect, it } from "vitest"
import { LLM_EVENT_REVIEW_DECISION, LLM_EVENT_REVIEW_STATUS } from "@/shared/constants/llm-review"
import { formatEventPrice, formatSlugLabel, sanitizePostgrestLike } from "./format"

describe("formatEventPrice", () => {
  it("returns 'Free' when isFree is true regardless of price", () => {
    expect(formatEventPrice(null, true)).toBe("Free")
    expect(formatEventPrice(15, true)).toBe("Free")
  })

  it("returns 'See details' when price is null and not free", () => {
    expect(formatEventPrice(null, false)).toBe("See details")
  })

  it("formats a numeric price with a dollar sign", () => {
    expect(formatEventPrice(15, false)).toBe("$15")
    expect(formatEventPrice(0, false)).toBe("$0")
  })
})

describe("formatSlugLabel", () => {
  it.each([
    [LLM_EVENT_REVIEW_DECISION.NEEDS_ADMIN_REVIEW, "Needs Admin Review"],
    ["low_confidence", "Low Confidence"],
    [LLM_EVENT_REVIEW_STATUS.NOT_REQUIRED, "Not Required"],
    ["timed-out", "Timed Out"],
    ["llm_review_failed", "LLM Review Failed"],
    ["ai_tag_status", "AI Tag Status"],
    ["", "—"],
  ])("formats %s as %s", (value, expected) => {
    expect(formatSlugLabel(value)).toBe(expected)
  })

  it("uses the fallback for nullish values", () => {
    expect(formatSlugLabel(null, "Pending")).toBe("Pending")
  })
})

describe("sanitizePostgrestLike", () => {
  it("passes through plain alphanumeric input", () => {
    expect(sanitizePostgrestLike("music festival")).toBe("music festival")
  })

  it("strips PostgREST reserved characters", () => {
    // , . ( ) : * % _ " '
    expect(sanitizePostgrestLike("a,b.c(d)e:f*g%h_i\"j'k")).toBe("a b c d e f g h i j k")
  })

  it("collapses resulting whitespace runs", () => {
    expect(sanitizePostgrestLike("a   ,,,   b")).toBe("a b")
  })

  it("trims leading and trailing whitespace", () => {
    expect(sanitizePostgrestLike("  hello  ")).toBe("hello")
  })

  it("returns empty string for input that is only reserved characters", () => {
    expect(sanitizePostgrestLike(",.():*%_\"'")).toBe("")
  })

  it("neutralizes an attempt to break out of the .or() filter", () => {
    const hostile = "evil),title.ilike.%%"
    const result = sanitizePostgrestLike(hostile)
    expect(result).not.toMatch(/[,.()%]/)
  })

  it("handles empty string", () => {
    expect(sanitizePostgrestLike("")).toBe("")
  })
})
