import { z } from "zod"

/**
 * Zod row schemas for the `user_profiles` and `user_access` tables.
 *
 * Used at the Supabase boundary in `features/auth/api/load-profile-and-access.ts`
 * to replace the prior `as UserProfile | null` cast with a runtime parse —
 * an unexpected payload now fails loudly during `_syncSession` instead of
 * silently coercing.
 *
 * Optional/nullable fields mirror what the prior cast was accepting; keep
 * additive fields (added later by migrations) `.optional()` so partial
 * payloads from older clients still parse.
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
    // Optional / additive columns. Tolerate extras via `.passthrough()` so a
    // future migration that adds a column doesn't break the client.
  })
  .passthrough()

export type UserProfileRow = z.infer<typeof userProfileRowSchema>

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
  .passthrough()

export type UserAccessRow = z.infer<typeof userAccessRowSchema>
