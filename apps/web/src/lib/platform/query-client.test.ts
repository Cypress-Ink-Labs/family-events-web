import { describe, expect, it } from "vitest"
import { normalizeError } from "./query-client"

describe("normalizeError", () => {
  it("preserves Supabase object message, code, and status", () => {
    const error = normalizeError({
      message: "new row violates row-level security policy",
      code: "42501",
      status: 403,
    })

    expect(error.message).toBe(
      "new row violates row-level security policy · code=42501 · status=403"
    )
  })

  it("falls back through error_description, details, and error fields", () => {
    expect(normalizeError({ error_description: "token expired", statusCode: 401 }).message).toBe(
      "token expired · status=401"
    )
    expect(normalizeError({ details: "source run failed" }).message).toBe("source run failed")
    expect(normalizeError({ error: "permission denied", error_code: "42501" }).message).toBe(
      "permission denied · code=42501"
    )
  })

  it("enriches Error instances that carry Supabase fields", () => {
    const error = new Error("request failed") as Error & { code: string; status: number }
    error.code = "PGRST204"
    error.status = 400

    expect(normalizeError(error).message).toBe("request failed · code=PGRST204 · status=400")
  })
})
