import type { SupabaseClient } from "@supabase/supabase-js"
import { supabase } from "@/infrastructure/supabase/client"
import type { Database } from "@/lib/db"

/**
 * Data-access layer for the `public.user_preferred_cities` table. Hooks call
 * into these helpers; raw Supabase IO does not leak past this module. Each
 * helper throws on Supabase error so the caller can route it to TanStack
 * Query's onError path.
 *
 * The table has a partial unique index `WHERE is_primary` — at most one
 * `is_primary = true` row may exist per user at any committed point in time.
 * There is no server RPC for set replacement, so {@link savePreferredCities}
 * sequences writes client-side so the index is never violated mid-operation.
 */

// NOTE: a `type` alias (not an `interface`) — object-literal types carry an
// implicit index signature so they satisfy postgrest-js's
// `Row extends Record<string, unknown>` constraint; an interface would not,
// collapsing the augmented schema to `never` on writes.
export type PreferredCityRow = {
  user_id: string
  city_id: string
  is_primary: boolean
  created_at: string
}

// The published @cypress-ink-labs/contracts type lags the backend schema and
// does not yet include user_preferred_cities, so the generated `Database` type
// is missing the table. Rather than editing the read-only generated types or
// scattering `as any` casts, we extend the real `Database` with the one missing
// table at this single IO boundary, preserving full type-safety everywhere else
// the typed client is used. The shape mirrors the backend's generated row.
type DatabaseWithPreferredCities = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      user_preferred_cities: {
        Row: PreferredCityRow
        Insert: {
          user_id: string
          city_id: string
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          user_id?: string
          city_id?: string
          is_primary?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
  }
}

function preferredCitiesClient(): SupabaseClient<DatabaseWithPreferredCities> {
  return supabase as unknown as SupabaseClient<DatabaseWithPreferredCities>
}

/** Fetch every preferred-city row the signed-in user owns (RLS scopes to owner). */
export async function listPreferredCities(userId: string): Promise<PreferredCityRow[]> {
  const { data, error } = await preferredCitiesClient()
    .from("user_preferred_cities")
    .select("user_id, city_id, is_primary, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return data ?? []
}

/**
 * Replace the user's preferred-city set so that exactly the supplied
 * `cityIds` remain and `primaryCityId` is the single primary.
 *
 * Ordering matters because of the partial unique index on `is_primary`:
 *   1. Delete any rows for cities no longer selected (also clears stale primaries).
 *   2. Demote the existing primary to `is_primary = false` BEFORE promoting the
 *      new one, so two `is_primary = true` rows never coexist mid-operation.
 *   3. Upsert every selected city as a non-primary row (insert-if-missing).
 *   4. Promote `primaryCityId` to `is_primary = true` last.
 */
export async function savePreferredCities(
  userId: string,
  cityIds: readonly string[],
  primaryCityId: string
): Promise<void> {
  const client = preferredCitiesClient()
  const uniqueCityIds = Array.from(new Set(cityIds))

  if (!uniqueCityIds.includes(primaryCityId)) {
    throw new Error("The primary city must be one of the selected cities.")
  }

  // 1. Drop cities the user removed from the set.
  const removeQuery = client.from("user_preferred_cities").delete().eq("user_id", userId)
  const { error: deleteError } = await (uniqueCityIds.length > 0
    ? removeQuery.not("city_id", "in", `(${uniqueCityIds.join(",")})`)
    : removeQuery)
  if (deleteError) throw deleteError

  // 2. Demote the current primary first — never hold two primaries at once.
  const { error: demoteError } = await client
    .from("user_preferred_cities")
    .update({ is_primary: false })
    .eq("user_id", userId)
    .eq("is_primary", true)
    .neq("city_id", primaryCityId)
  if (demoteError) throw demoteError

  // 3. Ensure a (non-primary) row exists for every selected city.
  const { error: upsertError } = await client.from("user_preferred_cities").upsert(
    uniqueCityIds.map((cityId) => ({ user_id: userId, city_id: cityId, is_primary: false })),
    { onConflict: "user_id,city_id" }
  )
  if (upsertError) throw upsertError

  // 4. Promote the chosen primary last, once no other primary exists.
  const { error: promoteError } = await client
    .from("user_preferred_cities")
    .update({ is_primary: true })
    .eq("user_id", userId)
    .eq("city_id", primaryCityId)
  if (promoteError) throw promoteError
}
