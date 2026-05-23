import { describe, expect, it } from "vitest"
import { isCityCentroidCoordinate } from "./map-helpers"

describe("isCityCentroidCoordinate", () => {
  const city = { latitude: 30.2241, longitude: -92.0198 }

  it("treats exact city-center coordinates as imprecise placeholders", () => {
    expect(isCityCentroidCoordinate({ latitude: 30.2241, longitude: -92.0198 }, city)).toBe(true)
  })

  it("uses the same tolerance as the enrichment claim SQL", () => {
    expect(isCityCentroidCoordinate({ latitude: 30.2241004, longitude: -92.0198004 }, city)).toBe(
      true
    )
    expect(isCityCentroidCoordinate({ latitude: 30.224102, longitude: -92.019802 }, city)).toBe(
      false
    )
  })

  it("keeps null coordinates out of the centroid placeholder path", () => {
    expect(isCityCentroidCoordinate({ latitude: null, longitude: -92.0198 }, city)).toBe(false)
    expect(isCityCentroidCoordinate({ latitude: 30.2241, longitude: null }, city)).toBe(false)
    expect(isCityCentroidCoordinate({ latitude: 30.2241, longitude: -92.0198 }, null)).toBe(false)
  })
})
