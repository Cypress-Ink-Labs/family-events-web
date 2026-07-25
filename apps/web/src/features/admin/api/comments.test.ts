import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockFrom, mockSelect, mockEq, mockOrder, mockRange } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockOrder: vi.fn(),
  mockRange: vi.fn(),
}))

vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: { from: mockFrom },
}))

import { listAdminComments } from "./comments"

const rows = [{ id: "newest" }, { id: "older" }]

function prepareQuery(result: {
  data: unknown[] | null
  count: number | null
  error: Error | null
}) {
  const query = {
    eq: mockEq,
    order: mockOrder,
    range: mockRange,
  }

  mockEq.mockReturnValue(query)
  mockOrder.mockReturnValue(query)
  mockRange.mockResolvedValue(result)
  mockSelect.mockReturnValue(query)
  mockFrom.mockReturnValue({ select: mockSelect })
}

beforeEach(() => {
  vi.resetAllMocks()
  prepareQuery({ data: rows, count: 101, error: null })
})

describe("listAdminComments", () => {
  it("uses exact count, newest-first ordering, and the first 50-row range", async () => {
    await expect(listAdminComments(0, "all")).resolves.toEqual({ rows, totalCount: 101 })

    expect(mockFrom).toHaveBeenCalledWith("comments")
    expect(mockSelect).toHaveBeenCalledWith(expect.any(String), { count: "exact" })
    expect(mockEq).not.toHaveBeenCalled()
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false })
    expect(mockRange).toHaveBeenCalledWith(0, 49)
  })

  it("uses the next 50-row range for page one", async () => {
    await listAdminComments(1, "all")

    expect(mockRange).toHaveBeenCalledWith(50, 99)
  })

  it.each([
    ["all", []],
    ["flagged", [["is_flagged", true]]],
    [
      "pending",
      [
        ["is_approved", false],
        ["is_flagged", false],
      ],
    ],
    [
      "approved",
      [
        ["is_approved", true],
        ["is_flagged", false],
      ],
    ],
  ] as const)("maps the %s filter to the disjoint server query", async (filter, expectedCalls) => {
    await listAdminComments(0, filter)

    expect(mockEq.mock.calls).toEqual(expectedCalls)
  })

  it("falls back to zero when Supabase returns a null exact count", async () => {
    prepareQuery({ data: null, count: null, error: null })

    await expect(listAdminComments(0, "all")).resolves.toEqual({ rows: [], totalCount: 0 })
  })
})
