import { adminEventFacetRowSchema, parseRowsWithSentry } from "@/lib/schemas"
import { supabase } from "@/lib/supabase/client"
import { sanitizePostgrestLike } from "@/lib/utils"
import type { Event } from "@/lib/types"

export async function fetchAdminEventFacets(keyword: string) {
  const { data, error } = await supabase.rpc("admin_event_facets", {
    p_keyword: sanitizePostgrestLike(keyword) || undefined,
  })
  if (error) throw error
  return parseRowsWithSentry(adminEventFacetRowSchema, data, {
    area: "admin.events.facets",
  })
}

export async function updateAdminEventStatus(
  eventId: string,
  status: Event["status"],
  reason: string | null = null
): Promise<Event["status"]> {
  const { error } = await supabase.rpc("admin_update_event_status", {
    p_event_id: eventId,
    p_status: status,
    p_reason: reason,
  })
  if (error) throw error
  return status
}

export async function batchUpdateAdminEventStatus(
  eventIds: string[],
  status: Event["status"]
): Promise<{ count: number; status: Event["status"] }> {
  const { data, error } = await supabase.rpc("admin_batch_set_event_status", {
    p_event_ids: eventIds,
    p_status: status,
  })
  if (error) throw error
  return { count: data ?? 0, status }
}

export async function deleteAdminEvents(eventIds: string[]): Promise<{ count: number }> {
  const { data, error } = await supabase.rpc("admin_delete_events", {
    p_event_ids: eventIds,
  })
  if (error) throw error
  return { count: data ?? 0 }
}
