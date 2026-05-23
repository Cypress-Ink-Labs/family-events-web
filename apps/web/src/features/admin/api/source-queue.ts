import { supabase } from "@/lib/supabase/client"
import type { SourceQueueStatus as DbSourceQueueStatus } from "@/lib/types"

export type SourceQueueStatus = DbSourceQueueStatus

export interface SourceQueueSummaryRow {
  status: SourceQueueStatus
  row_count: number
  oldest_enqueued_at: string | null
  oldest_processing_started_at: string | null
  newest_finished_at: string | null
  last_dead_letter_at: string | null
  avg_attempts: number | null
}

export interface DeadSourceQueueRow {
  id: number
  source_id: string | null
  source_run_id: string | null
  trigger_type: string
  attempt_count: number
  enqueued_at: string
  finished_at: string | null
  last_error: string | null
  event_sources: { name: string | null } | null
}

const SOURCE_QUEUE_SUMMARY_COLUMNS =
  "status, row_count, oldest_enqueued_at, oldest_processing_started_at, newest_finished_at, last_dead_letter_at, avg_attempts"

const DEAD_SOURCE_QUEUE_COLUMNS =
  "id, source_id, source_run_id, trigger_type, attempt_count, enqueued_at, finished_at, last_error, event_sources(name)"

export async function fetchSourceQueueSummary(): Promise<SourceQueueSummaryRow[]> {
  const { data, error } = await supabase
    .from("source_scrape_queue_summary")
    .select(SOURCE_QUEUE_SUMMARY_COLUMNS)
  if (error) throw error
  return (data ?? []) as SourceQueueSummaryRow[]
}

export async function fetchDeadSourceQueueRows(): Promise<DeadSourceQueueRow[]> {
  const { data, error } = await supabase
    .from("source_scrape_queue")
    .select(DEAD_SOURCE_QUEUE_COLUMNS)
    .eq("status", "dead")
    .order("finished_at", { ascending: false })
    .limit(20)
  if (error) throw error
  return (data ?? []) as DeadSourceQueueRow[]
}

export async function retrySourceQueue(queueId: number): Promise<boolean> {
  const { data, error } = await supabase.rpc("admin_retry_source_scrape_queue", {
    p_queue_id: queueId,
  })
  if (error) throw error
  return Boolean(data)
}

export async function deleteDeadSourceQueueRow(queueId: number): Promise<boolean> {
  const { data, error } = await supabase.rpc("admin_delete_dead_source_queue", {
    p_queue_id: queueId,
  })
  if (error) throw error
  return Boolean(data)
}
