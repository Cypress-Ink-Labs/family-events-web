import { describe, expect, it } from "vitest"
import { formatEventPrice, sanitizePostgrestLike } from "./format"

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
    // Classic injection try: close the current clause, open another
    const hostile = "evil),title.ilike.%%"
    const result = sanitizePostgrestLike(hostile)
    // No parens, commas, or percents survive
    expect(result).not.toMatch(/[,.()%]/)
  })

  it("handles empty string", () => {
    expect(sanitizePostgrestLike("")).toBe("")
  })
})
