import { describe, expect, it } from "vitest"
import { userAccessRowSchema, userProfileRowSchema } from "@/lib/schemas/auth"

describe("userProfileRowSchema", () => {
  it("parses the minimal known shape to the domain shape", () => {
    const row = {
      id: "user-1",
      email: "person@example.com",
      display_name: "Person",
      role: "user",
      created_at: "2026-05-23T00:00:00Z",
      updated_at: "2026-05-23T00:00:00Z",
    }
    // Required-but-nullable columns absent from the row normalize to `null`.
    expect(userProfileRowSchema.parse(row)).toEqual({
      id: "user-1",
      email: "person@example.com",
      display_name: "Person",
      avatar_url: null,
      role: "user",
      created_at: "2026-05-23T00:00:00Z",
      updated_at: "2026-05-23T00:00:00Z",
      child_name: null,
      child_age: null,
      city_preference_id: null,
    })
  })

  it("preserves the full known column set", () => {
    const row = {
      id: "user-1",
      email: null,
      display_name: null,
      avatar_url: "https://example.com/a.png",
      role: "admin",
      created_at: "2026-05-23T00:00:00Z",
      updated_at: "2026-05-23T00:00:00Z",
      child_name: "Kid",
      child_age: 5,
      city_preference_id: "city-1",
    }
    expect(userProfileRowSchema.parse(row)).toEqual(row)
  })

  it("tolerates additional fields but drops them from the typed output", () => {
    const row = {
      id: "user-1",
      email: null,
      display_name: null,
      role: "admin",
      created_at: "2026-05-23T00:00:00Z",
      updated_at: "2026-05-23T00:00:00Z",
      new_column_added_by_migration: "x",
    }
    // A future migration column must not throw, but it is not part of the
    // domain shape so the transform drops it from the parsed output.
    const parsed = userProfileRowSchema.parse(row) as Record<string, unknown>
    expect(parsed.new_column_added_by_migration).toBeUndefined()
    expect(parsed.role).toBe("admin")
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

  it("tolerates additional fields but drops them from the typed output", () => {
    const row = {
      user_id: "user-1",
      is_enabled: true,
      enabled_at: "2026-05-23T00:00:00Z",
      disabled_at: null,
      disabled_reason: null,
      created_at: "2026-05-23T00:00:00Z",
      updated_at: "2026-05-23T00:00:00Z",
      new_column_added_by_migration: "x",
    }
    const parsed = userAccessRowSchema.parse(row) as Record<string, unknown>
    expect(parsed.new_column_added_by_migration).toBeUndefined()
    expect(parsed.is_enabled).toBe(true)
  })
})
