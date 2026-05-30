import { supabase } from "@/infrastructure/supabase/client"
import type { TagQueueStatus as DbTagQueueStatus } from "@/shared/types"

export type TagQueueStatus = DbTagQueueStatus

export interface TagQueueSummaryRow {
  status: TagQueueStatus
  row_count: number
  oldest_enqueued_at: string | null
  newest_enqueued_at: string | null
  last_dead_letter_at: string | null
  avg_attempts: number | null
}

export interface DeadTagQueueRow {
  id: number
  event_id: string
  source_run_id: string | null
  trigger_type: string
  attempt_count: number
  enqueued_at: string
  finished_at: string | null
  last_error: string | null
  events: { title: string | null } | null
}

const TAG_QUEUE_SUMMARY_COLUMNS =
  "status, row_count, oldest_enqueued_at, newest_enqueued_at, last_dead_letter_at, avg_attempts"

const DEAD_TAG_QUEUE_COLUMNS =
  "id, event_id, source_run_id, trigger_type, attempt_count, enqueued_at, finished_at, last_error, events(title)"

export async function fetchTagQueueSummary(): Promise<TagQueueSummaryRow[]> {
  const { data, error } = await supabase
    .from("event_tag_queue_summary")
    .select(TAG_QUEUE_SUMMARY_COLUMNS)
  if (error) throw error
  return (data ?? []) as TagQueueSummaryRow[]
}

export async function fetchDeadTagQueueRows(): Promise<DeadTagQueueRow[]> {
  const { data, error } = await supabase
    .from("event_tag_queue")
    .select(DEAD_TAG_QUEUE_COLUMNS)
    .eq("status", "dead")
    .order("finished_at", { ascending: false })
    .limit(20)
  if (error) throw error
  return (data ?? []) as DeadTagQueueRow[]
}

export async function retryTagQueue(queueId: number): Promise<boolean> {
  const { data, error } = await supabase.rpc("admin_retry_dead_tag_queue", {
    p_queue_id: queueId,
  })
  if (error) throw error
  return Boolean(data)
}

export async function deleteDeadTagQueueRow(queueId: number): Promise<boolean> {
  const { data, error } = await supabase.rpc("admin_delete_dead_tag_queue", {
    p_queue_id: queueId,
  })
  if (error) throw error
  return Boolean(data)
}
