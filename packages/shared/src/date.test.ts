import { describe, expect, it } from "vitest"
import { toIsoDateOnly } from "./date"

describe("toIsoDateOnly", () => {
  it("returns YYYY-MM-DD from UTC date", () => {
    const value = new Date("2026-05-14T12:34:56.000Z")
    expect(toIsoDateOnly(value)).toBe("2026-05-14")
  })
})
