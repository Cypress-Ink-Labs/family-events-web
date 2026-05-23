import { describe, expect, it } from "vitest"
import { userAccessRowSchema, userProfileRowSchema } from "@/lib/schemas/auth"

describe("userProfileRowSchema", () => {
  it("accepts the minimal known shape", () => {
    const row = {
      id: "user-1",
      email: "person@example.com",
      display_name: "Person",
      role: "user",
      created_at: "2026-05-23T00:00:00Z",
      updated_at: "2026-05-23T00:00:00Z",
    }
    expect(userProfileRowSchema.parse(row)).toMatchObject({ id: "user-1", role: "user" })
  })

  it("tolerates additional fields via passthrough", () => {
    const row = {
      id: "user-1",
      email: null,
      display_name: null,
      role: "admin",
      created_at: "2026-05-23T00:00:00Z",
      updated_at: "2026-05-23T00:00:00Z",
      new_column_added_by_migration: "x",
    }
    const parsed = userProfileRowSchema.parse(row) as Record<string, unknown>
    expect(parsed.new_column_added_by_migration).toBe("x")
  })

  it("rejects an unknown role value", () => {
    const row = {
      id: "user-1",
      email: null,
      display_name: null,
      role: "superuser",
      created_at: "2026-05-23T00:00:00Z",
      updated_at: "2026-05-23T00:00:00Z",
    }
    expect(() => userProfileRowSchema.parse(row)).toThrowError()
  })
})

describe("userAccessRowSchema", () => {
  it("accepts a granted row", () => {
    const row = {
      user_id: "user-1",
      is_enabled: true,
      enabled_at: "2026-05-23T00:00:00Z",
      disabled_at: null,
      disabled_reason: null,
      created_at: "2026-05-23T00:00:00Z",
      updated_at: "2026-05-23T00:00:00Z",
    }
    expect(userAccessRowSchema.parse(row)).toMatchObject({ is_enabled: true })
  })

  it("accepts a disabled row with reason", () => {
    const row = {
      user_id: "user-1",
      is_enabled: false,
      enabled_at: null,
      disabled_at: "2026-05-23T00:00:00Z",
      disabled_reason: "spam",
      created_at: "2026-05-23T00:00:00Z",
      updated_at: "2026-05-23T00:00:00Z",
    }
    expect(userAccessRowSchema.parse(row)).toMatchObject({
      is_enabled: false,
      disabled_reason: "spam",
    })
  })

  it("rejects when `is_enabled` is not a boolean", () => {
    const row = {
      user_id: "user-1",
      is_enabled: "yes",
      enabled_at: null,
      disabled_at: null,
      disabled_reason: null,
      created_at: "2026-05-23T00:00:00Z",
      updated_at: "2026-05-23T00:00:00Z",
    }
    expect(() => userAccessRowSchema.parse(row)).toThrowError()
  })
})
