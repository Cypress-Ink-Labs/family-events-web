import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { QueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { supabase } from "@/lib/supabase"
import type { Event, Json } from "@/lib/types"
import type { AdminEventPatch } from "@/features/admin/lib/event-editor-mappers"

interface UpdateAdminEventInput {
  eventId: string
  patch: AdminEventPatch
  tagIds: string[]
  lockEditedFields?: boolean
}

interface CreateAdminEventInput {
  patch: AdminEventPatch
  tagIds: string[]
}

function invalidateEventQueries(queryClient: QueryClient, eventId?: string) {
  void queryClient.invalidateQueries({ queryKey: qk.admin.events.all })
  void queryClient.invalidateQueries({ queryKey: qk.events.all })
  void queryClient.invalidateQueries({ queryKey: qk.events.detailAll })
  void queryClient.invalidateQueries({ queryKey: qk.enrichedEvents.all })
  if (eventId) {
    void queryClient.invalidateQueries({ queryKey: qk.admin.events.detail(eventId) })
    void queryClient.invalidateQueries({ queryKey: qk.admin.eventAiTrace(eventId) })
    void queryClient.invalidateQueries({ queryKey: qk.events.detailById(eventId) })
  }
}

export function useUpdateAdminEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      eventId,
      patch,
      tagIds,
      lockEditedFields = true,
    }: UpdateAdminEventInput): Promise<Event> => {
      const { data, error } = await supabase.rpc("admin_update_event", {
        p_event_id: eventId,
        p_patch: patch as Json,
        p_tag_ids: tagIds,
        p_lock_edited_fields: lockEditedFields,
      })
      if (error) {
        throw error
      }
      return data as Event
    },
    onSuccess: (_event, variables) => {
      invalidateEventQueries(queryClient, variables.eventId)
    },
  })
}

export function useCreateAdminEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ patch, tagIds }: CreateAdminEventInput): Promise<Event> => {
      const { data, error } = await supabase.rpc("admin_create_event", {
        p_patch: patch as Json,
        p_tag_ids: tagIds,
      })
      if (error) {
        throw error
      }
      return data as Event
    },
    onSuccess: (event) => {
      invalidateEventQueries(queryClient, event.id)
    },
  })
}

export function useUnlockAdminEventFields() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.rpc("admin_unlock_event_fields", {
        p_event_id: eventId,
      })
      if (error) {
        throw error
      }
      return eventId
    },
    onSuccess: (eventId) => {
      invalidateEventQueries(queryClient, eventId)
    },
  })
}
