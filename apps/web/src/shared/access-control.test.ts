import { describe, expect, it } from "vitest"
import {
  evaluateAccessState,
  getSessionExpiryTimeoutMs,
  HOME_PATH,
  isPublicPath,
  isSessionExpired,
  resolveInAppRedirectTarget,
} from "./access-control"
import type { UserAccess } from "@/shared/types"

function accessRow(overrides: Partial<UserAccess> = {}): UserAccess {
  return {
    user_id: "user-1",
    is_enabled: true,
    enabled_at: "2026-04-17T00:00:00.000Z",
    disabled_at: null,
    disabled_reason: null,
    created_at: "2026-04-17T00:00:00.000Z",
    updated_at: "2026-04-17T00:00:00.000Z",
    ...overrides,
  }
}

describe("evaluateAccessState", () => {
  it("treats visitors without a session as signed out", () => {
    expect(evaluateAccessState(null, null)).toEqual({
      isAllowed: false,
      shouldSignOut: false,
      reason: "signed-out",
    })
  })

  it("allows users with an enabled access row", () => {
    expect(evaluateAccessState({ user: { id: "user-1" } }, accessRow())).toEqual({
      isAllowed: true,
      shouldSignOut: false,
      reason: "allowed",
    })
  })

  it("forces sign-out when the access row is missing", () => {
    expect(evaluateAccessState({ user: { id: "user-1" } }, null)).toEqual({
      isAllowed: false,
      shouldSignOut: true,
      reason: "missing-access",
    })
  })

  it("forces sign-out when the access row is disabled", () => {
    expect(
      evaluateAccessState(
        { user: { id: "user-1" } },
        accessRow({
          is_enabled: false,
          disabled_at: "2026-04-17T01:00:00.000Z",
          disabled_reason: "beta closed",
        })
      )
    ).toEqual({
      isAllowed: false,
      shouldSignOut: true,
      reason: "disabled",
    })
  })
})

describe("isPublicPath", () => {
  it("allows only marketing and auth routes", () => {
    expect(isPublicPath("/")).toBe(true)
    expect(isPublicPath("/sign-in")).toBe(true)
    expect(isPublicPath("/sign-up")).toBe(true)
    expect(isPublicPath("/explore")).toBe(false)
    expect(isPublicPath("/events/abc")).toBe(false)
    expect(isPublicPath("/admin")).toBe(false)
  })

  it("keeps the authenticated landing page off the public allowlist", () => {
    expect(HOME_PATH).toBe("/home")
    expect(isPublicPath(HOME_PATH)).toBe(false)
  })
})

describe("resolveInAppRedirectTarget", () => {
  it("accepts same-app absolute paths", () => {
    expect(resolveInAppRedirectTarget("/events/event-1")).toBe("/events/event-1")
  })

  it("falls back for external, protocol-relative, and non-string values", () => {
    expect(resolveInAppRedirectTarget("https://example.com")).toBe(HOME_PATH)
    expect(resolveInAppRedirectTarget("//example.com")).toBe(HOME_PATH)
    expect(resolveInAppRedirectTarget("javascript:alert(1)")).toBe(HOME_PATH)
    expect(resolveInAppRedirectTarget(null)).toBe(HOME_PATH)
  })

  it("allows callers to provide a domain-specific fallback", () => {
    expect(resolveInAppRedirectTarget("https://example.com", "/sign-in")).toBe("/sign-in")
  })
})

describe("isSessionExpired", () => {
  it("returns false when the session has no expiry timestamp", () => {
    expect(isSessionExpired({ user: { id: "user-1" } })).toBe(false)
  })

  it("returns false when the session expiry is still in the future", () => {
    expect(
      isSessionExpired({ user: { id: "user-1" }, expires_at: 1_800_000_100 }, 1_800_000_000)
    ).toBe(false)
  })

  it("returns true when the session expiry is in the past", () => {
    expect(
      isSessionExpired({ user: { id: "user-1" }, expires_at: 1_799_999_999 }, 1_800_000_000)
    ).toBe(true)
  })
})

describe("getSessionExpiryTimeoutMs", () => {
  it("returns null when there is no expiry timestamp", () => {
    expect(getSessionExpiryTimeoutMs({ user: { id: "user-1" } }, 1_800_000_000_000)).toBeNull()
  })

  it("returns the remaining milliseconds until expiry", () => {
    expect(
      getSessionExpiryTimeoutMs(
        { user: { id: "user-1" }, expires_at: 1_800_000_100 },
        1_800_000_000_000
      )
    ).toBe(100_000)
  })

  it("returns zero when the session is already expired", () => {
    expect(
      getSessionExpiryTimeoutMs(
        { user: { id: "user-1" }, expires_at: 1_799_999_999 },
        1_800_000_000_000
      )
    ).toBe(0)
  })
})
