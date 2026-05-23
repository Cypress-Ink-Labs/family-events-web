import { supabase } from "@/infrastructure/supabase/client"
import type { Event, Json } from "@/shared/types"
import type { AdminEventPatch } from "@/features/admin/lib/event-editor-mappers"

export interface UpdateAdminEventInput {
  eventId: string
  patch: AdminEventPatch
  tagIds: string[]
  lockEditedFields?: boolean
}

export interface CreateAdminEventInput {
  patch: AdminEventPatch
  tagIds: string[]
}

export async function updateAdminEvent({
  eventId,
  patch,
  tagIds,
  lockEditedFields = true,
}: UpdateAdminEventInput): Promise<Event> {
  const { data, error } = await supabase.rpc("admin_update_event", {
    p_event_id: eventId,
    p_patch: patch as Json,
    p_tag_ids: tagIds,
    p_lock_edited_fields: lockEditedFields,
  })
  if (error) throw error
  return data as Event
}

export async function createAdminEvent({ patch, tagIds }: CreateAdminEventInput): Promise<Event> {
  const { data, error } = await supabase.rpc("admin_create_event", {
    p_patch: patch as Json,
    p_tag_ids: tagIds,
  })
  if (error) throw error
  return data as Event
}

export async function unlockAdminEventFields(eventId: string): Promise<string> {
  const { error } = await supabase.rpc("admin_unlock_event_fields", {
    p_event_id: eventId,
  })
  if (error) throw error
  return eventId
}
