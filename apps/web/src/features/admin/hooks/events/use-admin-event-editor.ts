import { useMutation, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import {
  createAdminEvent,
  type CreateAdminEventInput,
  type UpdateAdminEventInput,
  unlockAdminEventFields,
  updateAdminEvent,
} from "@/features/admin/api/event-editor"

export function useUpdateAdminEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateAdminEventInput) => updateAdminEvent(input),
    onSuccess: async (_event, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.admin.events.all }),
        queryClient.invalidateQueries({ queryKey: qk.events.all }),
        queryClient.invalidateQueries({ queryKey: qk.events.detailAll }),
        queryClient.invalidateQueries({ queryKey: qk.enrichedEvents.all }),
        queryClient.invalidateQueries({ queryKey: qk.admin.events.detail(variables.eventId) }),
        queryClient.invalidateQueries({ queryKey: qk.admin.eventAiTrace(variables.eventId) }),
        queryClient.invalidateQueries({ queryKey: qk.events.detailById(variables.eventId) }),
        queryClient.invalidateQueries({ queryKey: qk.admin.stats }),
      ])
    },
  })
}

export function useCreateAdminEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateAdminEventInput) => createAdminEvent(input),
    onSuccess: async (event) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.admin.events.all }),
        queryClient.invalidateQueries({ queryKey: qk.events.all }),
        queryClient.invalidateQueries({ queryKey: qk.events.detailAll }),
        queryClient.invalidateQueries({ queryKey: qk.enrichedEvents.all }),
        queryClient.invalidateQueries({ queryKey: qk.admin.events.detail(event.id) }),
        queryClient.invalidateQueries({ queryKey: qk.admin.eventAiTrace(event.id) }),
        queryClient.invalidateQueries({ queryKey: qk.events.detailById(event.id) }),
        queryClient.invalidateQueries({ queryKey: qk.admin.stats }),
      ])
    },
  })
}

export function useUnlockAdminEventFields() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) => unlockAdminEventFields(eventId),
    onSuccess: async (eventId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.admin.events.all }),
        queryClient.invalidateQueries({ queryKey: qk.events.all }),
        queryClient.invalidateQueries({ queryKey: qk.events.detailAll }),
        queryClient.invalidateQueries({ queryKey: qk.enrichedEvents.all }),
        queryClient.invalidateQueries({ queryKey: qk.admin.events.detail(eventId) }),
        queryClient.invalidateQueries({ queryKey: qk.admin.eventAiTrace(eventId) }),
        queryClient.invalidateQueries({ queryKey: qk.events.detailById(eventId) }),
      ])
    },
  })
}
