import { supabase } from "@/lib/supabase"

// TODO: Replace `as any` with generated Database types after `pnpm db:types`

export interface AdminEventsCursor {
  afterCreatedAt?: string
  afterId?: string
}

export interface AdminEventsFilters {
  status?: string
  cityId?: string
  cityIsNull?: boolean
  keyword?: string
  limit?: number
}

export async function fetchAdminEventsPage(
  filters: AdminEventsFilters,
  cursor?: AdminEventsCursor
) {
  const { data, error } = await (supabase.rpc as any)("admin_events_enriched", {
    p_status: filters.status,
    p_city_id: filters.cityId,
    p_city_is_null: filters.cityIsNull,
    p_keyword: filters.keyword,
    p_after_created_at: cursor?.afterCreatedAt,
    p_after_id: cursor?.afterId,
    p_limit: filters.limit ?? 200,
  })
  if (error) throw error
  return data ?? []
}
