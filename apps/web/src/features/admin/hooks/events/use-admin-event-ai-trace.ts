import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import { fetchEventAiTrace, updateAdminEventTags } from "@/features/admin/api/event-ai-trace"

export function useAdminEventAiTrace(eventId: string | null) {
  return useQuery({
    queryKey: qk.admin.eventAiTrace(eventId),
    enabled: Boolean(eventId),
    queryFn: async () => {
      if (!eventId) return null
      return fetchEventAiTrace(eventId)
    },
  })
}

export function useUpdateAdminEventTags() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, tagIds }: { eventId: string; tagIds: string[] }) =>
      updateAdminEventTags(eventId, tagIds),
    onSuccess: (eventId) => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.events.all })
      void queryClient.invalidateQueries({ queryKey: qk.admin.eventAiTrace(eventId) })
      void queryClient.invalidateQueries({ queryKey: qk.events.all })
      void queryClient.invalidateQueries({ queryKey: qk.events.detailAll })
      void queryClient.invalidateQueries({ queryKey: qk.enrichedEvents.all })
      void queryClient.invalidateQueries({ queryKey: qk.admin.events.detail(eventId) })
      void queryClient.invalidateQueries({ queryKey: qk.events.detailById(eventId) })
    },
  })
}
