import { useMutation, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import {
  createAdminEvent,
  type CreateAdminEventInput,
  type UpdateAdminEventInput,
  unlockAdminEventFields,
  updateAdminEvent,
} from "@/features/admin/api/event-editor"

function invalidateAdminEventQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  eventId: string
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.admin.events.all }),
    queryClient.invalidateQueries({ queryKey: qk.events.all }),
    queryClient.invalidateQueries({ queryKey: qk.events.detailAll }),
    queryClient.invalidateQueries({ queryKey: qk.enrichedEvents.all }),
    queryClient.invalidateQueries({ queryKey: qk.admin.events.detail(eventId) }),
    queryClient.invalidateQueries({ queryKey: qk.admin.eventAiTrace(eventId) }),
    queryClient.invalidateQueries({ queryKey: qk.events.detailById(eventId) }),
  ])
}

export function useUpdateAdminEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateAdminEventInput) => updateAdminEvent(input),
    onSuccess: async (_event, variables) => {
      await invalidateAdminEventQueries(queryClient, variables.eventId)
    },
  })
}

export function useCreateAdminEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateAdminEventInput) => createAdminEvent(input),
    onSuccess: async (event) => {
      await invalidateAdminEventQueries(queryClient, event.id)
    },
  })
}

export function useUnlockAdminEventFields() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) => unlockAdminEventFields(eventId),
    onSuccess: async (eventId) => {
      await invalidateAdminEventQueries(queryClient, eventId)
    },
  })
}
