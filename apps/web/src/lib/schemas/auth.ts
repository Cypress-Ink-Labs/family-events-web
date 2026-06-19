import { z } from "zod"
import type { UserAccess, UserProfile } from "@/shared/types"

/**
 * Zod row schemas for the `user_profiles` and `user_access` tables.
 *
 * Used at the Supabase boundary in `features/auth/api/load-profile-and-access.ts`
 * to replace the prior `as UserProfile | null` cast with a runtime parse —
 * an unexpected payload now fails loudly during `_syncSession` instead of
 * silently coercing.
 *
 * Each schema `.transform()`s its parsed input into the exact domain shape so
 * the inferred output is assignable to `UserProfile` / `UserAccess` with no
 * cast — the compiler now enforces the schema-output ↔ domain-type match. The
 * schemas still tolerate extra columns (a later migration adding a column does
 * not throw); those extras are simply dropped from the typed output rather than
 * passed through, since the domain type does not model them.
 *
 * Optional/nullable fields mirror what the prior cast was accepting. Columns
 * that the domain type models as required-but-nullable are normalized to
 * `string | null` (an absent value becomes `null`).
 */

export const userProfileRowSchema = z
  .object({
    id: z.string(),
    email: z.string().nullable(),
    display_name: z.string().nullable(),
    avatar_url: z.string().nullable().optional(),
    role: z.enum(["user", "admin"]),
    created_at: z.string(),
    updated_at: z.string(),
    child_name: z.string().nullable().optional(),
    child_age: z.number().nullable().optional(),
    city_preference_id: z.string().nullable().optional(),
  })
  .transform(
    (row): UserProfile => ({
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      avatar_url: row.avatar_url ?? null,
      role: row.role,
      created_at: row.created_at,
      updated_at: row.updated_at,
      child_name: row.child_name ?? null,
      child_age: row.child_age ?? null,
      city_preference_id: row.city_preference_id ?? null,
    })
  )

export const userAccessRowSchema = z
  .object({
    user_id: z.string(),
    is_enabled: z.boolean(),
    enabled_at: z.string().nullable(),
    disabled_at: z.string().nullable(),
    disabled_reason: z.string().nullable(),
    access_expires_at: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .transform(
    (row): UserAccess => ({
      user_id: row.user_id,
      is_enabled: row.is_enabled,
      enabled_at: row.enabled_at,
      disabled_at: row.disabled_at,
      disabled_reason: row.disabled_reason,
      access_expires_at: row.access_expires_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })
  )
