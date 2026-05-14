import { describe, expect, it } from "vitest"
import { planEventsRowSchema, planEventsWindowRowSchema } from "./plan"

describe("planEventsRowSchema", () => {
  it("accepts the canonical plan_events_for_user row", () => {
    const parsed = planEventsRowSchema.parse({
      event_id: "evt-1",
      score: 0.85,
      distance_score: 0.9,
      weather_score: 0.8,
      age_score: 0.5,
      history_affinity: 0.2,
      distance_km: 4.2,
    })
    expect(parsed.score).toBe(0.85)
    expect(parsed.distance_km).toBe(4.2)
  })

  it("coerces numeric strings (PostgREST numeric serialization)", () => {
    const parsed = planEventsRowSchema.parse({
      event_id: "evt-1",
      score: "0.85",
      distance_score: "0.9",
      weather_score: "0.8",
      age_score: "0.5",
      history_affinity: "0.2",
      distance_km: "4.2",
    })
    expect(parsed.score).toBe(0.85)
    expect(parsed.distance_km).toBe(4.2)
  })

  it("allows null distance_km when geocoding is missing", () => {
    const parsed = planEventsRowSchema.parse({
      event_id: "evt-1",
      score: 0.5,
      distance_score: 0.5,
      weather_score: 0.5,
      age_score: 0.5,
      history_affinity: 0,
      distance_km: null,
    })
    expect(parsed.distance_km).toBeNull()
  })

  it("rejects a row missing event_id", () => {
    const result = planEventsRowSchema.safeParse({
      score: 0.5,
      distance_score: 0.5,
      weather_score: 0.5,
      age_score: 0.5,
      history_affinity: 0,
      distance_km: null,
    })
    expect(result.success).toBe(false)
  })
})

describe("planEventsWindowRowSchema", () => {
  it("accepts a window row with non-negative integer day_offset", () => {
    const parsed = planEventsWindowRowSchema.parse({
      event_id: "evt-1",
      score: 0.5,
      distance_score: 0.5,
      weather_score: 0.5,
      age_score: 0.5,
      history_affinity: 0,
      distance_km: null,
      day_offset: 0,
    })
    expect(parsed.day_offset).toBe(0)
  })

  it("rejects negative day_offset", () => {
    const result = planEventsWindowRowSchema.safeParse({
      event_id: "evt-1",
      score: 0.5,
      distance_score: 0.5,
      weather_score: 0.5,
      age_score: 0.5,
      history_affinity: 0,
      distance_km: null,
      day_offset: -1,
    })
    expect(result.success).toBe(false)
  })
})
