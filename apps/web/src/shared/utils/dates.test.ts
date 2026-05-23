import { describe, expect, it } from "vitest"
import {
  formatEventDate,
  formatEventDateTime,
  formatEventTime,
  formatLastRun,
  formatTimeRange,
} from "@/shared/utils/dates"

const FIXED = new Date(2026, 4, 23, 14, 30) // 2026-05-23T14:30 local

describe("formatEventDateTime", () => {
  it("formats as 'EEE, MMM d · h:mm a'", () => {
    expect(formatEventDateTime(FIXED)).toBe("Sat, May 23 · 2:30 PM")
  })

  it("accepts ISO strings", () => {
    expect(formatEventDateTime(FIXED.toISOString())).toMatch(/^\w{3}, \w{3} \d{1,2} · /)
  })
})

describe("formatEventDate / formatEventTime", () => {
  it("formats date and time independently", () => {
    expect(formatEventDate(FIXED)).toBe("Sat, May 23")
    expect(formatEventTime(FIXED)).toBe("2:30 PM")
  })
})

describe("formatTimeRange", () => {
  it("collapses to time-only when start and end share a day", () => {
    const start = new Date(2026, 4, 23, 14, 30)
    const end = new Date(2026, 4, 23, 16, 0)
    expect(formatTimeRange(start, end)).toBe("2:30 PM - 4:00 PM")
  })

  it("falls back to full date+time when range crosses days", () => {
    const start = new Date(2026, 4, 23, 22, 0)
    const end = new Date(2026, 4, 24, 1, 0)
    expect(formatTimeRange(start, end)).toBe("Sat, May 23 · 10:00 PM - Sun, May 24 · 1:00 AM")
  })
})

describe("formatLastRun", () => {
  it("uses time-only for today", () => {
    const today = new Date()
    today.setHours(14, 30, 0, 0)
    expect(formatLastRun(today)).toBe("2:30pm")
  })

  it("uses month/day + time for this year", () => {
    const thisYear = new Date()
    thisYear.setMonth(0, 5)
    thisYear.setHours(9, 15, 0, 0)
    expect(formatLastRun(thisYear)).toMatch(/^1\/5 9:15am$/)
  })

  it("uses short date for previous years", () => {
    const oldDate = new Date(2024, 4, 23, 12, 0)
    expect(formatLastRun(oldDate)).toBe("5/23/24")
  })
})
