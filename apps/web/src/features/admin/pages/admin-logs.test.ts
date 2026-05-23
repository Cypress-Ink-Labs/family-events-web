import { describe, expect, it } from "vitest"

import { canRetrySourceRunStatus } from "./admin-logs"

describe("canRetrySourceRunStatus", () => {
  it.each(["error", "partial", "timed_out"] as const)("allows retry for %s runs", (status) => {
    expect(canRetrySourceRunStatus(status)).toBe(true)
  })

  it.each(["success", "running"] as const)("does not retry %s runs", (status) => {
    expect(canRetrySourceRunStatus(status)).toBe(false)
  })
})
