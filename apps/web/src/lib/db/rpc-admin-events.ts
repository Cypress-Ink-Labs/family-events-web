import { z } from "zod"

import { eventRowSchema, parseRowsWithSentry } from "@/lib/schemas"
import { supabase } from "@/lib/supabase"
import { sanitizePostgrestLike } from "@/lib/utils"
import type { Event, Json } from "@/lib/types"

export interface AdminEventsCursor {
  afterCreatedAt?: string
  afterId?: string
}

export interface AdminEventsFilters {
  status?: Event["status"]
  cityId?: string
  cityIsNull?: boolean
  keyword?: string
  limit?: number
}

export interface AdminEventsPageResult {
  rows: Event[]
  totalCount: number
  nextCursor?: AdminEventsCursor
}

export interface AdminEventFacetRow {
  city_id: string | null
  status: Event["status"]
  count: number
}

const defaultAdminEventsLimit = 200
const maxAdminEventsLimit = 500

const adminEventEnrichedRowSchema = eventRowSchema.extend({
  recurrence_info: z
    .unknown()
    .nullable()
    .optional()
    .transform((value): Json | null => (value ?? null) as Json | null),
  is_outdoor: z
    .boolean()
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  search_vector: z
    .string()
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  total_count: z.coerce.number().int().nonnegative(),
})

type AdminEventEnrichedRow = Event & { total_count: number }

function normalizeAdminEventsLimit(limit?: number) {
  const requested = limit ?? defaultAdminEventsLimit
  const clamped = Math.min(Math.max(requested, 1), maxAdminEventsLimit)
  return clamped
}

export async function fetchAdminEventsPage(
  filters: AdminEventsFilters,
  cursor?: AdminEventsCursor
): Promise<AdminEventsPageResult> {
  const limit = normalizeAdminEventsLimit(filters.limit)
  const keyword = sanitizePostgrestLike(filters.keyword ?? "") || undefined
  const { data, error } = await supabase.rpc("admin_events_enriched", {
    p_status: filters.status,
    p_city_id: filters.cityId,
    p_city_is_null: filters.cityIsNull,
    p_keyword: keyword,
    p_after_created_at: cursor?.afterCreatedAt,
    p_after_id: cursor?.afterId,
    p_limit: limit,
  })
  if (error) {
    throw error
  }

  const rows = parseRowsWithSentry(adminEventEnrichedRowSchema, data ?? [], {
    area: "admin.events.list",
  }) as AdminEventEnrichedRow[]
  const loadedCount = rows.length
  const totalCount = rows[0]?.total_count ?? 0

  return {
    rows,
    totalCount,
    nextCursor:
      loadedCount > 0 && loadedCount === limit && loadedCount < totalCount
        ? {
            afterCreatedAt: rows[loadedCount - 1].created_at,
            afterId: rows[loadedCount - 1].id,
          }
        : undefined,
  }
}
