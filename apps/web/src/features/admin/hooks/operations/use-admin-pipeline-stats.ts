import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/infrastructure/supabase/client"
import { qk } from "@/infrastructure/queries/query-keys"

export interface PipelineLearningStats {
  window_days: number
  total_reviewed: number
  llm_reviewed: number
  admin_reviewed: number
  auto_rejected: number
  memory_hits: number
  total_embeddings: number
  tag_memory_hits: number
  top_rejection_sources: Array<{
    source_id: string
    source_name: string
    total: number
    rejected: number
    rejection_rate: number
  }>
  feature_flags: Record<string, boolean>
}

async function fetchPipelineStats(): Promise<PipelineLearningStats> {
  const { data, error } = await supabase.rpc("pipeline_learning_stats", {
    p_window_days: 30,
  })
  if (error) throw error
  // RPC returns Json; shape is defined by the SQL function.
  return data as unknown as PipelineLearningStats
}

export function useAdminPipelineStats() {
  return useQuery({
    queryKey: [...qk.admin.stats, "pipeline-learning"],
    queryFn: fetchPipelineStats,
    staleTime: 60_000,
    refetchInterval: 120_000,
  })
}
