import { afterEach, describe, expect, it, vi } from "vitest"

// savePreferredCities delegates the full set-replacement + primary swap +
// city_preference_id mirror to the `set_preferred_cities` RPC (one atomic
// transaction, backend CIL-187). These tests assert the RPC call shape.
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: { rpc },
}))

import { savePreferredCities } from "./preferred-cities"

afterEach(() => vi.clearAllMocks())

describe("savePreferredCities", () => {
  it("calls the set_preferred_cities RPC with the selected set and primary", async () => {
    rpc.mockResolvedValue({ error: null })

    await savePreferredCities(["city-a", "city-b"], "city-b")

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith("set_preferred_cities", {
      p_city_ids: ["city-a", "city-b"],
      p_primary_city_id: "city-b",
    })
  })

  it("deduplicates repeated city ids before calling the RPC", async () => {
    rpc.mockResolvedValue({ error: null })

    await savePreferredCities(["city-a", "city-a", "city-b"], "city-a")

    expect(rpc).toHaveBeenCalledWith("set_preferred_cities", {
      p_city_ids: ["city-a", "city-b"],
      p_primary_city_id: "city-a",
    })
  })

  it("rejects without calling the RPC when the primary is not in the selected set", async () => {
    await expect(savePreferredCities(["city-a"], "city-b")).rejects.toThrow(
      /primary city must be one of the selected cities/i
    )
    expect(rpc).not.toHaveBeenCalled()
  })

  it("throws when the RPC returns an error", async () => {
    rpc.mockResolvedValue({ error: new Error("row-level security") })

    await expect(savePreferredCities(["city-a"], "city-a")).rejects.toThrow(/row-level security/i)
  })
})
