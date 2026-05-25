import { describe, expect, it } from "vitest"
import { LLM_EVENT_REVIEW_DECISION, LLM_EVENT_REVIEW_STATUS } from "@/shared/constants/llm-review"
import { enrichedEventRowSchema, eventRowSchema } from "./event"

const baseEventRow = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Test Event",
  description: null,
  start_datetime: "2026-05-12T20:00:00Z",
  end_datetime: null,
  timezone: "America/Chicago",
  venue_name: null,
  address: null,
  city_id: null,
  latitude: null,
  longitude: null,
  age_min: null,
  age_max: null,
  price: null,
  is_free: true,
  source_url: null,
  source_name: null,
  source_id: null,
  images: [],
  status: "published",
  ai_confidence: null,
  ai_tag_provider: null,
  ai_tag_model: null,
  ai_tag_status: null,
  llm_review_status: LLM_EVENT_REVIEW_STATUS.NOT_REQUIRED,
  llm_review_decision: null,
  llm_review_confidence: null,
  llm_review_reason: null,
  llm_review_flags: [],
  llm_review_provider: null,
  llm_review_model: null,
  llm_review_prompt_version: null,
  llm_reviewed_at: null,
  llm_review_error: null,
  recurrence_info: null,
  is_featured: false,
  is_outdoor: null,
  admin_locked_fields: [],
  admin_last_edited_at: null,
  admin_last_edited_by: null,
  view_count: 0,
  search_vector: null,
  created_at: "2026-05-12T00:00:00Z",
  updated_at: "2026-05-12T00:00:00Z",
}

describe("eventRowSchema", () => {
  it("accepts a fully-populated valid row", () => {
    const parsed = eventRowSchema.parse(baseEventRow)
    expect(parsed.id).toBe(baseEventRow.id)
    expect(parsed.images).toEqual([])
  })

  it("normalizes null images to empty array", () => {
    const parsed = eventRowSchema.parse({ ...baseEventRow, images: null })
    expect(parsed.images).toEqual([])
  })

  it("rejects rows missing required fields", () => {
    const { id: _, ...missingId } = baseEventRow
    const result = eventRowSchema.safeParse(missingId)
    expect(result.success).toBe(false)
  })

  it("rejects invalid status enum values", () => {
    const result = eventRowSchema.safeParse({ ...baseEventRow, status: "deleted" })
    expect(result.success).toBe(false)
  })

  it("accepts local model tagging providers", () => {
    const parsed = eventRowSchema.parse({ ...baseEventRow, ai_tag_provider: "ollama" })
    expect(parsed.ai_tag_provider).toBe("ollama")
  })

  it("parses llm review metadata when present", () => {
    const parsed = eventRowSchema.parse({
      ...baseEventRow,
      llm_review_status: LLM_EVENT_REVIEW_STATUS.SUCCEEDED,
      llm_review_decision: LLM_EVENT_REVIEW_DECISION.APPROVE,
      llm_review_confidence: 0.91,
      llm_review_reason: "High confidence family event",
      llm_review_flags: ["verified"],
      llm_review_provider: "openai-compatible",
      llm_review_model: "gpt-4o-mini",
      llm_review_prompt_version: "event-review-v1",
      llm_reviewed_at: "2026-05-12T01:00:00Z",
      llm_review_error: null,
    })
    expect(parsed.llm_review_status).toBe(LLM_EVENT_REVIEW_STATUS.SUCCEEDED)
    expect(parsed.llm_review_decision).toBe(LLM_EVENT_REVIEW_DECISION.APPROVE)
    expect(parsed.llm_review_confidence).toBe(0.91)
  })

  it("rejects non-boolean is_free", () => {
    const result = eventRowSchema.safeParse({ ...baseEventRow, is_free: "yes" })
    expect(result.success).toBe(false)
  })
})

describe("enrichedEventRowSchema", () => {
  it("accepts the events_enriched RPC shape with tags + ratings", () => {
    const parsed = enrichedEventRowSchema.parse({
      ...baseEventRow,
      tags: [{ id: "tag-1", name: "Outdoor", slug: "outdoor", color: "#fff" }],
      avg_rating: 4.2,
      rating_count: 12,
      is_favorited: true,
      is_in_calendar: false,
    })
    expect(parsed.tags).toHaveLength(1)
    expect(parsed.avg_rating).toBe(4.2)
    expect(parsed.is_favorited).toBe(true)
  })

  it("defaults missing enrichment fields", () => {
    const parsed = enrichedEventRowSchema.parse(baseEventRow)
    expect(parsed.tags).toEqual([])
    expect(parsed.image_attributions).toEqual([])
    expect(parsed.avg_rating).toBe(0)
    expect(parsed.rating_count).toBe(0)
    expect(parsed.is_favorited).toBe(false)
    expect(parsed.is_in_calendar).toBe(false)
  })

  it("accepts public Unsplash attribution JSON and drops malformed entries", () => {
    const parsed = enrichedEventRowSchema.parse({
      ...baseEventRow,
      image_attributions: [
        {
          provider: "unsplash",
          image_url: "https://images.unsplash.com/photo.jpg",
          matched_tag: "museum",
          photo_id: "abc",
          photographer_name: "Jane Doe",
          photographer_username: "jane",
          photographer_profile_url: "https://unsplash.com/@jane",
          photo_url: "https://unsplash.com/photos/abc",
        },
        { provider: "unsplash", download_location: "should-not-be-required" },
      ],
    })

    expect(parsed.image_attributions).toHaveLength(1)
    expect(parsed.image_attributions[0]).toMatchObject({
      photographer_name: "Jane Doe",
      photo_url: "https://unsplash.com/photos/abc",
    })
    expect(parsed.image_attributions[0]).not.toHaveProperty("download_location")
  })

  it("coerces numeric strings on avg_rating / rating_count", () => {
    const parsed = enrichedEventRowSchema.parse({
      ...baseEventRow,
      avg_rating: "3.5",
      rating_count: "7",
    })
    expect(parsed.avg_rating).toBe(3.5)
    expect(parsed.rating_count).toBe(7)
  })

  it("treats null avg_rating / rating_count as 0", () => {
    const parsed = enrichedEventRowSchema.parse({
      ...baseEventRow,
      avg_rating: null,
      rating_count: null,
    })
    expect(parsed.avg_rating).toBe(0)
    expect(parsed.rating_count).toBe(0)
  })
})
