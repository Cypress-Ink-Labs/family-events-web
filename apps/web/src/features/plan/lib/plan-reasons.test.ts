import { describe, expect, it } from "vitest"
import { planReasonChips } from "./plan-reasons"

const reasonScores = (scores: Partial<Parameters<typeof planReasonChips>[0]>) =>
  scores as Parameters<typeof planReasonChips>[0]

describe("planReasonChips", () => {
  it("orders labels by descending score", () => {
    expect(
      planReasonChips(
        reasonScores({
          distance_score: 0.7,
          weather_score: 0.9,
          age_score: 0.8,
          history_affinity: 0.5,
        })
      )
    ).toEqual(["Good for today's weather", "Great age fit"])
  })

  it("drops null scores, including absent saved-event affinity", () => {
    expect(
      planReasonChips(
        reasonScores({
          distance_score: null,
          weather_score: 0.9,
          age_score: undefined,
          history_affinity: null,
        })
      )
    ).toEqual(["Good for today's weather"])
  })

  it.each([
    [0.59, ["Close by"]],
    [0.6, ["Close by", "Good for today's weather"]],
  ])("includes the second label only at the 0.6 threshold", (weatherScore, expected) => {
    expect(
      planReasonChips(
        reasonScores({
          distance_score: 0.9,
          weather_score: weatherScore,
          age_score: null,
          history_affinity: null,
        })
      )
    ).toEqual(expected)
  })

  it("returns no more than two labels", () => {
    expect(
      planReasonChips(
        reasonScores({
          distance_score: 1,
          weather_score: 0.9,
          age_score: 0.8,
          history_affinity: 0.7,
        })
      )
    ).toHaveLength(2)
  })

  it("returns an empty array when every score is null", () => {
    expect(
      planReasonChips(
        reasonScores({
          distance_score: null,
          weather_score: null,
          age_score: null,
          history_affinity: null,
        })
      )
    ).toEqual([])
  })
})
