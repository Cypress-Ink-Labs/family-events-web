import { describe, it, expect, vi } from "vitest"
import { checkForUpdate, isDynamicImportError, DYNAMIC_IMPORT_ERROR_PATTERN } from "./version-check"

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  })
}

describe("checkForUpdate", () => {
  it("returns stale=true when remote version differs", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ version: "abc123", builtAt: "x" }))
    const result = await checkForUpdate("old-sha", fetcher as unknown as typeof fetch)
    expect(result.stale).toBe(true)
    expect(result.remoteVersion).toBe("abc123")
    expect(fetcher).toHaveBeenCalledWith(
      "/version.json",
      expect.objectContaining({ cache: "no-store" })
    )
  })

  it("returns stale=false when remote version matches", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ version: "same", builtAt: "x" }))
    const result = await checkForUpdate("same", fetcher as unknown as typeof fetch)
    expect(result.stale).toBe(false)
    expect(result.remoteVersion).toBe("same")
  })

  it("returns stale=false when fetch rejects (network error)", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("network"))
    const result = await checkForUpdate("anything", fetcher as unknown as typeof fetch)
    expect(result.stale).toBe(false)
    expect(result.remoteVersion).toBeNull()
  })

  it("returns stale=false on non-2xx response", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("", { status: 404 }))
    const result = await checkForUpdate("anything", fetcher as unknown as typeof fetch)
    expect(result.stale).toBe(false)
    expect(result.remoteVersion).toBeNull()
  })

  it("returns stale=false when manifest is malformed", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ builtAt: "x" }))
    const result = await checkForUpdate("anything", fetcher as unknown as typeof fetch)
    expect(result.stale).toBe(false)
    expect(result.remoteVersion).toBeNull()
  })

  it("returns stale=false on empty version string", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ version: "" }))
    const result = await checkForUpdate("anything", fetcher as unknown as typeof fetch)
    expect(result.stale).toBe(false)
  })
})

describe("isDynamicImportError", () => {
  it("matches the failing-dynamic-import error from the screenshot", () => {
    const err = new Error(
      "Failed to fetch dynamically imported module: https://family-events.org/assets/admin-invites-DrNDL-c2.js"
    )
    expect(isDynamicImportError(err)).toBe(true)
  })

  it("matches WebKit's wording", () => {
    expect(isDynamicImportError(new Error("Importing a module script failed."))).toBe(true)
    expect(isDynamicImportError(new Error("Importing a script failed"))).toBe(true)
  })

  it("matches Firefox's wording", () => {
    expect(isDynamicImportError(new Error("error loading dynamically imported module"))).toBe(true)
  })

  it("returns false for normal errors", () => {
    expect(isDynamicImportError(new Error("Cannot read property of undefined"))).toBe(false)
    expect(isDynamicImportError(null)).toBe(false)
    expect(isDynamicImportError(undefined)).toBe(false)
  })

  it("accepts plain string error reasons (unhandledrejection.reason can be non-Error)", () => {
    expect(isDynamicImportError("Failed to fetch dynamically imported module: /x.js")).toBe(true)
    expect(isDynamicImportError("nope")).toBe(false)
  })

  it("DYNAMIC_IMPORT_ERROR_PATTERN export is reusable for direct testing", () => {
    expect(DYNAMIC_IMPORT_ERROR_PATTERN.test("Failed to fetch dynamically imported module")).toBe(
      true
    )
  })
})
