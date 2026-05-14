import { describe, expect, it } from "vitest"
import { resolveInviteRequirement } from "./use-invites"

describe("resolveInviteRequirement", () => {
  it("fails closed while invite status is still unknown", () => {
    expect(resolveInviteRequirement(undefined, false)).toBe(true)
  })

  it("fails closed when the invite check errors", () => {
    expect(resolveInviteRequirement(false, true)).toBe(true)
    expect(resolveInviteRequirement(undefined, true)).toBe(true)
  })

  it("respects an explicit disabled gate", () => {
    expect(resolveInviteRequirement(false, false)).toBe(false)
  })

  it("respects an explicit enabled gate", () => {
    expect(resolveInviteRequirement(true, false)).toBe(true)
  })
})
