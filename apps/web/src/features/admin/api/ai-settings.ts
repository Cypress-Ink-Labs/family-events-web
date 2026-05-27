import { supabase } from "@/infrastructure/supabase/client"
import type { AiFeatureConfig, ApprovedAiModel } from "@/features/admin/types"

export async function getApprovedAiModels(): Promise<ApprovedAiModel[]> {
  const { data, error } = await supabase.rpc("get_approved_ai_models")
  if (error) throw error
  return (data ?? []) as ApprovedAiModel[]
}

export async function getAiFeatureConfigs(): Promise<AiFeatureConfig[]> {
  const { data, error } = await supabase
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
  const { error } = await supabase.rpc("upsert_ai_feature_config", {
    p_feature: feature,
    p_model_id: modelId,
    p_enabled: enabled,
  })
  if (error) throw error
}
