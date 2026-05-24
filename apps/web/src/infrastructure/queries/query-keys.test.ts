import { describe, expect, it } from "vitest"
import { ADMIN_LLM_REVIEW_FILTER } from "@/shared/constants/llm-review"
import { qk } from "./query-keys"

describe("qk.events", () => {
  it("normalizes list params into stable readonly tuple keys", () => {
    const a = qk.events.list({
      filters: {
        cityId: "city-1",
        keyword: "  storytime  ",
        tagSlugs: ["music", "art", "music"],
      },
      userId: undefined,
      limit: 100,
      offset: 0,
    })
    const b = qk.events.list({
      filters: {
        cityId: "city-1",
        keyword: "storytime",
        tagSlugs: ["art", "music"],
      },
      limit: 100,
      offset: 0,
    })

    expect(a).toEqual(b)
    expect(a[0]).toBe("events")
  })

  it("uses the same keyword normalization as the event search RPC boundary", () => {
    const a = qk.events.list({
      filters: {
        keyword: " storytime,or(status.eq.draft) ",
      },
      limit: 100,
      offset: 0,
    })
    const b = qk.events.list({
      filters: {
        keyword: "storytime or status eq draft",
      },
      limit: 100,
      offset: 0,
    })

    expect(a).toEqual(b)
  })

  it("keeps event detail namespaces available for broad invalidation", () => {
    expect(qk.events.detailById("event-1")).toEqual(["event", "event-1"])
    expect(qk.events.detail("event-1", "user-1")).toEqual(["event", "event-1", "user-1"])
  })
})

describe("qk.enrichedEvents", () => {
  it("sorts and dedupes id keys", () => {
    expect(qk.enrichedEvents.key({ eventIds: ["b", "a", "b"] })).toEqual([
      "events-enriched",
      "by-ids",
      ["a", "b"],
      null,
    ])
  })
})

describe("qk.admin.events", () => {
  it("uses sanitized keyword params for admin event search keys", () => {
    expect(
      qk.admin.events.list({
        keyword: " storytime,or(status.eq.draft) ",
        status: "all",
      })
    ).toEqual(qk.admin.events.list({ keyword: "storytime or status eq draft", status: "all" }))
  })

  it("includes page size in admin event list cache key", () => {
    expect(
      qk.admin.events.list({
        keyword: "storytime",
        status: "all",
        cityFilter: "all",
        pageSize: 200,
      })
    ).toEqual(
      qk.admin.events.list({
        keyword: "storytime",
        status: "all",
        cityFilter: "all",
        pageSize: 200,
      })
    )
    expect(
      qk.admin.events.list({
        keyword: "storytime",
        status: "all",
        cityFilter: "all",
        pageSize: 50,
      })
    ).not.toEqual(
      qk.admin.events.list({
        keyword: "storytime",
        status: "all",
        cityFilter: "all",
        pageSize: 200,
      })
    )
  })

  it("changes key when llm review filter changes", () => {
    expect(
      qk.admin.events.list({
        keyword: "storytime",
        status: "all",
        cityFilter: "all",
        llmReviewFilter: ADMIN_LLM_REVIEW_FILTER.FAILED,
      })
    ).not.toEqual(
      qk.admin.events.list({
        keyword: "storytime",
        status: "all",
        cityFilter: "all",
        llmReviewFilter: ADMIN_LLM_REVIEW_FILTER.ALL,
      })
    )
  })
})
