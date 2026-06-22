import { afterEach, describe, expect, it, vi } from "vitest"

// Records the exact sequence of statements savePreferredCities issues so the
// test can prove a primary is never promoted while another primary still
// exists (the partial unique index would otherwise reject the second one).
interface RecordedOp {
  op: "delete" | "update" | "upsert"
  filters: Record<string, unknown>
  values?: Record<string, unknown>
  rows?: unknown
}

const { ops, from } = vi.hoisted(() => {
  const ops: RecordedOp[] = []

  // The builder is a real Promise (so `await` resolves to { error: null })
  // augmented with the chainable filter methods the helper calls. Building on a
  // genuine Promise avoids hand-rolling a `then` thenable, which oxlint forbids.
  function makeBuilder(op: RecordedOp) {
    const chain = {
      eq(column: string, value: unknown) {
        op.filters[`eq:${column}`] = value
        return builder
      },
      neq(column: string, value: unknown) {
        op.filters[`neq:${column}`] = value
        return builder
      },
      not(column: string, operator: string, value: unknown) {
        op.filters[`not:${column}:${operator}`] = value
        return builder
      },
    }
    const builder = Object.assign(Promise.resolve({ error: null }), chain)
    return builder
  }

  const table = {
    delete() {
      const op: RecordedOp = { op: "delete", filters: {} }
      ops.push(op)
      return makeBuilder(op)
    },
    update(values: Record<string, unknown>) {
      const op: RecordedOp = { op: "update", filters: {}, values }
      ops.push(op)
      return makeBuilder(op)
    },
    upsert(rows: unknown) {
      const op: RecordedOp = { op: "upsert", filters: {}, rows }
      ops.push(op)
      return makeBuilder(op)
    },
  }

  const from = vi.fn(() => table)
  return { ops, from }
})

vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: { from },
}))

import { savePreferredCities } from "./preferred-cities"

const USER_ID = "user-1"

afterEach(() => {
  ops.length = 0
  vi.clearAllMocks()
})

describe("savePreferredCities", () => {
  it("demotes the existing primary BEFORE promoting the new one", async () => {
    await savePreferredCities(USER_ID, ["city-a", "city-b"], "city-b")

    const demoteIndex = ops.findIndex((op) => op.op === "update" && op.values?.is_primary === false)
    const promoteIndex = ops.findIndex((op) => op.op === "update" && op.values?.is_primary === true)

    expect(demoteIndex).toBeGreaterThanOrEqual(0)
    expect(promoteIndex).toBeGreaterThanOrEqual(0)
    // The demotion must be sequenced before the promotion: two is_primary=true
    // rows can never be committed at the same time.
    expect(demoteIndex).toBeLessThan(promoteIndex)
  })

  it("never issues two is_primary=true writes in one operation", async () => {
    await savePreferredCities(USER_ID, ["city-a", "city-b", "city-c"], "city-c")

    const promotions = ops.filter((op) => op.op === "update" && op.values?.is_primary === true)
    expect(promotions).toHaveLength(1)
    expect(promotions[0]?.filters["eq:city_id"]).toBe("city-c")
  })

  it("scopes the demotion to the current user and excludes the new primary", async () => {
    await savePreferredCities(USER_ID, ["city-a", "city-b"], "city-b")

    const demote = ops.find((op) => op.op === "update" && op.values?.is_primary === false)
    expect(demote?.filters["eq:user_id"]).toBe(USER_ID)
    expect(demote?.filters["eq:is_primary"]).toBe(true)
    expect(demote?.filters["neq:city_id"]).toBe("city-b")
  })

  it("removes cities no longer in the selected set", async () => {
    await savePreferredCities(USER_ID, ["city-a", "city-b"], "city-a")

    const del = ops.find((op) => op.op === "delete")
    expect(del?.filters["eq:user_id"]).toBe(USER_ID)
    expect(del?.filters["not:city_id:in"]).toBe("(city-a,city-b)")
  })

  it("upserts every selected city as a non-primary row first", async () => {
    await savePreferredCities(USER_ID, ["city-a", "city-b"], "city-b")

    const upsert = ops.find((op) => op.op === "upsert")
    expect(upsert?.rows).toEqual([
      { user_id: USER_ID, city_id: "city-a", is_primary: false },
      { user_id: USER_ID, city_id: "city-b", is_primary: false },
    ])
  })

  it("rejects when the primary is not part of the selected set", async () => {
    await expect(savePreferredCities(USER_ID, ["city-a"], "city-b")).rejects.toThrow(
      /primary city must be one of the selected cities/i
    )
    expect(ops).toHaveLength(0)
  })

  it("deduplicates repeated city ids before writing", async () => {
    await savePreferredCities(USER_ID, ["city-a", "city-a", "city-b"], "city-a")

    const upsert = ops.find((op) => op.op === "upsert")
    expect(upsert?.rows).toEqual([
      { user_id: USER_ID, city_id: "city-a", is_primary: false },
      { user_id: USER_ID, city_id: "city-b", is_primary: false },
    ])
  })
})
