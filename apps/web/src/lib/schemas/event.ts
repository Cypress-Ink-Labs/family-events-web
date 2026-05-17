import { z } from "zod"

// Boundary schemas for Supabase RPC results. They mirror src/lib/types.ts's
// hand-written Event / Tag / EventWithDetails contracts but validate at
// runtime so an RPC drift becomes a typed error at the data layer instead
// of a deep-component crash.

export const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  color: z
    .string()
    .nullable()
    .default("")
    .transform((v) => v ?? ""),
})

// Shape the events_enriched RPC emits per tag (jsonb_agg of the tag columns).
// Looser than `Tag` because the RPC doesn't return category/is_system/created_at.
export const enrichedTagSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  color: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? ""),
})

// Core events row. Mirrors the public.events table; nullables match the schema.
// `images` can arrive as null / JSON string / array of unknown — we normalize
// to string[] at the boundary because UI code never has to think about nulls.
export const eventRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  start_datetime: z.string(),
  end_datetime: z.string().nullable(),
  timezone: z.string(),
  venue_name: z.string().nullable(),
  address: z.string().nullable(),
  city_id: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  age_min: z.number().nullable(),
  age_max: z.number().nullable(),
  price: z.number().nullable(),
  is_free: z.boolean(),
  source_url: z.string().nullable(),
  source_name: z.string().nullable(),
  source_id: z.string().nullable(),
  images: z.union([z.array(z.string()), z.null()]).transform((v) => (Array.isArray(v) ? v : [])),
  status: z.enum(["draft", "published", "rejected", "archived"]),
  ai_confidence: z.number().nullable(),
  ai_tag_provider: z.enum(["openai", "keyword-fallback"]).nullable(),
  recurrence_info: z.unknown().nullable().optional(),
  is_featured: z.boolean(),
  is_outdoor: z
    .boolean()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  view_count: z.number(),
  search_vector: z.string().nullable().optional(),
  admin_locked_fields: z.array(z.string()).optional().default([]),
  admin_last_edited_at: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  admin_last_edited_by: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  created_at: z.string(),
  updated_at: z.string(),
})

export type EventRow = z.infer<typeof eventRowSchema>

// events_enriched RPC row: event columns + tags jsonb + denormalized stats.
// `avg_rating` / `rating_count` default to 0 when the underlying COALESCE
// surfaces NULL (no ratings yet). Boolean flags default to false for the
// no-user-id call path.
//
// `.default()` only fires on undefined, not null, so the transforms collapse
// both null and missing into the safe default. The resulting types are
// non-nullable, matching EventWithDetails contract downstream.
export const enrichedEventRowSchema = eventRowSchema.extend({
  // Filter malformed tag entries silently rather than failing the entire
  // event parse — historically the RPC's jsonb_agg has occasionally emitted
  // partial tag objects on drift, and surfacing those as a thrown error
  // would blank out the whole event card.
  tags: z.preprocess(
    (input) =>
      Array.isArray(input)
        ? input.filter((entry) => enrichedTagSchema.safeParse(entry).success)
        : [],
    z.array(enrichedTagSchema)
  ),
  avg_rating: z.coerce
    .number()
    .nullable()
    .optional()
    .transform((v) => v ?? 0),
  rating_count: z.coerce
    .number()
    .nullable()
    .optional()
    .transform((v) => v ?? 0),
  is_favorited: z
    .boolean()
    .nullable()
    .optional()
    .transform((v) => v ?? false),
  is_in_calendar: z
    .boolean()
    .nullable()
    .optional()
    .transform((v) => v ?? false),
})

export type EnrichedEventRow = z.infer<typeof enrichedEventRowSchema>
