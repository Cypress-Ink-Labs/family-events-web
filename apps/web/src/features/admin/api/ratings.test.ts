import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockFrom, mockSelect, mockOrder, mockRange } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockOrder: vi.fn(),
  mockRange: vi.fn(),
}))

vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: { from: mockFrom },
}))

import { listAdminRatings } from "./ratings"

const rows = [{ id: "newest" }, { id: "older" }]

function prepareQuery(result: {
  data: unknown[] | null
  count: number | null
  error: Error | null
}) {
  const query = {
    order: mockOrder,
    range: mockRange,
  }

  mockOrder.mockReturnValue(query)
  mockRange.mockResolvedValue(result)
  mockSelect.mockReturnValue(query)
  mockFrom.mockReturnValue({ select: mockSelect })
}

beforeEach(() => {
  vi.resetAllMocks()
  prepareQuery({ data: rows, count: 51, error: null })
})

describe("listAdminRatings", () => {
  it("uses exact count, newest-first ordering, and the first 50-row range", async () => {
    await expect(listAdminRatings(0)).resolves.toEqual({ rows, totalCount: 51 })

    expect(mockFrom).toHaveBeenCalledWith("ratings")
    expect(mockSelect).toHaveBeenCalledWith(expect.any(String), { count: "exact" })
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false })
    expect(mockRange).toHaveBeenCalledWith(0, 49)
  })

  it("uses the next 50-row range for page one", async () => {
    await listAdminRatings(1)

    expect(mockRange).toHaveBeenCalledWith(50, 99)
  })

  it("falls back to zero when Supabase returns a null exact count", async () => {
    prepareQuery({ data: null, count: null, error: null })

    await expect(listAdminRatings(0)).resolves.toEqual({ rows: [], totalCount: 0 })
  })
})
