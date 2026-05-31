import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { buildIcsEvent } from "./ics"

// Pin Date.now for deterministic DTSTAMP
const FIXED_NOW = new Date("2026-06-01T12:00:00Z")

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("buildIcsEvent", () => {
  const baseOptions = {
    uid: "evt-001",
    title: "Story Time at the Library",
    startDatetime: "2026-06-15T14:00:00Z",
    endDatetime: "2026-06-15T15:30:00Z",
    location: "Lafayette Public Library",
    description: "Join us for story time!",
    url: "https://family-events.org/events/evt-001",
  }

  it("produces valid VCALENDAR structure", () => {
    const ics = buildIcsEvent(baseOptions)
    expect(ics).toContain("BEGIN:VCALENDAR")
    expect(ics).toContain("END:VCALENDAR")
    expect(ics).toContain("BEGIN:VEVENT")
    expect(ics).toContain("END:VEVENT")
    expect(ics).toContain("VERSION:2.0")
    expect(ics).toContain("PRODID:-//Family Events//EN")
  })

  it("formats dates as UTC YYYYMMDDTHHMMSSZ", () => {
    const ics = buildIcsEvent(baseOptions)
    expect(ics).toContain("DTSTART:20260615T140000Z")
    expect(ics).toContain("DTEND:20260615T153000Z")
  })

  it("includes DTSTAMP with current time", () => {
    const ics = buildIcsEvent(baseOptions)
    expect(ics).toContain("DTSTAMP:20260601T120000Z")
  })

  it("includes UID with domain suffix", () => {
    const ics = buildIcsEvent(baseOptions)
    expect(ics).toContain("UID:evt-001@family-events")
  })

  it("includes SUMMARY, DESCRIPTION, LOCATION, URL", () => {
    const ics = buildIcsEvent(baseOptions)
    expect(ics).toContain("SUMMARY:Story Time at the Library")
    expect(ics).toContain("DESCRIPTION:Join us for story time!")
    expect(ics).toContain("LOCATION:Lafayette Public Library")
    expect(ics).toContain("URL:https://family-events.org/events/evt-001")
  })

  it("defaults end to start + 1 hour when endDatetime is null", () => {
    const ics = buildIcsEvent({
      ...baseOptions,
      endDatetime: null,
    })
    expect(ics).toContain("DTSTART:20260615T140000Z")
    expect(ics).toContain("DTEND:20260615T150000Z")
  })

  it("defaults end to start + 1 hour when endDatetime is omitted", () => {
    const { endDatetime: _, ...rest } = baseOptions
    const ics = buildIcsEvent(rest)
    expect(ics).toContain("DTEND:20260615T150000Z")
  })

  it("omits LOCATION when location is null", () => {
    const ics = buildIcsEvent({ ...baseOptions, location: null })
    expect(ics).not.toContain("LOCATION:")
  })

  it("omits DESCRIPTION when description is null", () => {
    const ics = buildIcsEvent({ ...baseOptions, description: null })
    expect(ics).not.toContain("DESCRIPTION:")
  })

  it("omits URL when url is null", () => {
    const ics = buildIcsEvent({ ...baseOptions, url: null })
    expect(ics).not.toContain("URL:")
  })

  it("escapes commas in text fields", () => {
    const ics = buildIcsEvent({
      ...baseOptions,
      title: "Story Time, Games, and Fun",
    })
    expect(ics).toContain("SUMMARY:Story Time\\, Games\\, and Fun")
  })

  it("escapes semicolons in text fields", () => {
    const ics = buildIcsEvent({
      ...baseOptions,
      location: "Room A; Second Floor",
    })
    expect(ics).toContain("LOCATION:Room A\\; Second Floor")
  })

  it("escapes newlines in description", () => {
    const ics = buildIcsEvent({
      ...baseOptions,
      description: "Line one\nLine two\nLine three",
    })
    expect(ics).toContain("DESCRIPTION:Line one\\nLine two\\nLine three")
  })

  it("escapes backslashes", () => {
    const ics = buildIcsEvent({
      ...baseOptions,
      title: "Fun \\ Games",
    })
    expect(ics).toContain("SUMMARY:Fun \\\\ Games")
  })

  it("uses CRLF line endings", () => {
    const ics = buildIcsEvent(baseOptions)
    expect(ics).toContain("\r\n")
    // No bare LF without preceding CR
    const lines = ics.split("\r\n")
    for (const line of lines) {
      expect(line).not.toContain("\n")
    }
  })

  it("folds lines longer than 75 characters", () => {
    const longDescription = "A".repeat(200)
    const ics = buildIcsEvent({
      ...baseOptions,
      description: longDescription,
    })
    const lines = ics.split("\r\n")
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(75)
    }
  })
})
