import { supabase } from "@/infrastructure/supabase/client"
import type { AiFeatureConfig, ApprovedAiModel } from "@/features/admin/types"

export async function getApprovedAiModels(): Promise<ApprovedAiModel[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_approved_ai_models")
  if (error) throw error
  return (data ?? []) as ApprovedAiModel[]
}

export async function getAiFeatureConfigs(): Promise<AiFeatureConfig[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("ai_feature_config")
    .select("feature, model_id, enabled, updated_at, updated_by")
    .order("feature")
  if (error) throw error
  return (data ?? []) as AiFeatureConfig[]
}

export async function upsertAiFeatureConfig(
  feature: "tagging" | "event-review",
  modelId: string,
  enabled: boolean
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("upsert_ai_feature_config", {
    p_feature: feature,
    p_model_id: modelId,
    p_enabled: enabled,
  })
  if (error) throw error
}
