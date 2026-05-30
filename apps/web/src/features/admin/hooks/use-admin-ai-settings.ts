import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import {
  getAiFeatureConfigs,
  getApprovedAiModels,
  upsertAiFeatureConfig,
} from "@/features/admin/api/ai-settings"
import type { AiFeatureId } from "@/features/admin/types"

export function useApprovedAiModels() {
  return useQuery({
    queryKey: qk.admin.approvedModels,
    queryFn: getApprovedAiModels,
    staleTime: 5 * 60 * 1000,
  })
}

export function useAiFeatureConfigs() {
  return useQuery({
    queryKey: qk.admin.aiSettings,
    queryFn: getAiFeatureConfigs,
  })
}

export function useUpsertAiFeatureConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      feature,
      modelId,
      enabled,
    }: {
      feature: AiFeatureId
      modelId: string
      enabled: boolean
    }) => upsertAiFeatureConfig(feature, modelId, enabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.aiSettings })
    },
  })
}
