import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

const captureExceptionSpy = vi.fn()

vi.mock("@/lib/sentry", () => ({
  Sentry: {
    captureException: (...args: unknown[]) => captureExceptionSpy(...args),
  },
}))

const { parseRowsWithSentry } = await import("./parse-rows")

const schema = z.object({ id: z.string(), value: z.number() })

beforeEach(() => {
  captureExceptionSpy.mockClear()
})

describe("parseRowsWithSentry", () => {
  it("returns all valid rows unchanged", () => {
    const rows = [
      { id: "a", value: 1 },
      { id: "b", value: 2 },
    ]
    const out = parseRowsWithSentry(schema, rows, { area: "test" })
    expect(out).toEqual(rows)
    expect(captureExceptionSpy).not.toHaveBeenCalled()
  })

  it("drops malformed individual rows and surfaces them to Sentry", () => {
    const rows = [
      { id: "a", value: 1 },
      { id: "b", value: "not-a-number" },
      { id: "c", value: 3 },
    ]
    const out = parseRowsWithSentry(schema, rows, { area: "test.area" })
    expect(out).toHaveLength(2)
    expect(out.map((r) => r.id)).toEqual(["a", "c"])
    expect(captureExceptionSpy).toHaveBeenCalledTimes(1)
    const call = captureExceptionSpy.mock.calls[0]
    expect(call[1]).toMatchObject({
      tags: { area: "test.area" },
      extra: { row_id: "b" },
    })
  })

  it("returns [] and emits one Sentry capture when rows is not an array", () => {
    const out = parseRowsWithSentry(schema, "not-an-array", { area: "test" })
    expect(out).toEqual([])
    expect(captureExceptionSpy).toHaveBeenCalledTimes(1)
  })

  it("returns [] without Sentry noise when rows is null/undefined (empty result)", () => {
    expect(parseRowsWithSentry(schema, null, { area: "test" })).toEqual([])
    expect(parseRowsWithSentry(schema, undefined, { area: "test" })).toEqual([])
    expect(captureExceptionSpy).not.toHaveBeenCalled()
  })
})
