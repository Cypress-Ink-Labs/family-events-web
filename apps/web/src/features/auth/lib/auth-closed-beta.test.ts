import { describe, expect, it } from "vitest"
import { getProviderInviteBlockMessage } from "./auth-closed-beta"

describe("getProviderInviteBlockMessage", () => {
  it("uses sign-in copy for blocked provider sign-in", () => {
    expect(getProviderInviteBlockMessage("sign-in")).toContain("sign in with email")
  })

  it("uses sign-up copy for blocked provider sign-up", () => {
    expect(getProviderInviteBlockMessage("sign-up")).toContain("request an invite code")
  })
})
