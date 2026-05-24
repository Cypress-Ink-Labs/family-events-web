import {
  ADMIN_CRON_FUNCTIONS,
  ADMIN_CRON_HISTORY_LIMIT,
  ADMIN_CRON_RPCS,
} from "@/features/admin/constants/cron"
import { supabase } from "@/infrastructure/supabase/client"
import type {
  CronJob,
  CronRun,
  RailwayCronJob,
  RailwayCronRun,
  RailwayCronRunDetail,
} from "@/features/admin/types"

export async function listCronJobs(): Promise<CronJob[]> {
  const { data, error } = await supabase.rpc(ADMIN_CRON_RPCS.listCronJobs)
  if (error) throw error
  return (data ?? []) as CronJob[]
}

export async function fetchCronHistory(jobName?: string): Promise<CronRun[]> {
  const { data, error } = await supabase.rpc(ADMIN_CRON_RPCS.cronRunHistory, {
    // Generated RPC types model "default NULL" params as undefined.
    p_job_name: jobName ?? undefined,
    p_limit: ADMIN_CRON_HISTORY_LIMIT,
  })
  if (error) throw error
  return ((data ?? []) as Omit<CronRun, "provider">[]).map((run) => ({
    ...run,
    provider: "pg_cron",
  }))
}

export async function toggleCronJob(jobName: string, active: boolean): Promise<void> {
  const { error } = await supabase.rpc(ADMIN_CRON_RPCS.toggleCronJob, {
    p_job_name: jobName,
    p_active: active,
  })
  if (error) throw error
}

export async function setCronSchedule(jobName: string, schedule: string): Promise<void> {
  const { error } = await supabase.rpc(ADMIN_CRON_RPCS.setCronSchedule, {
    p_job_name: jobName,
    p_schedule: schedule,
  })
  if (error) throw error
}

export async function listRailwayCronJobs(): Promise<RailwayCronJob[]> {
  const { data, error } = await supabase.rpc(ADMIN_CRON_RPCS.listRailwayCronJobs)
  if (error) throw error
  return (data ?? []) as RailwayCronJob[]
}

export async function fetchRailwayCronHistory(label?: string): Promise<RailwayCronRun[]> {
  const { data, error } = await supabase.rpc(ADMIN_CRON_RPCS.railwayCronRunHistory, {
    p_label: label ?? undefined,
    p_limit: ADMIN_CRON_HISTORY_LIMIT,
  })
  if (error) throw error
  return (data ?? []) as RailwayCronRun[]
}

export async function fetchRailwayCronRunDetail(runId: number): Promise<RailwayCronRunDetail> {
  const { data, error } = await supabase.rpc(ADMIN_CRON_RPCS.railwayCronRunDetail, {
    p_run_id: runId,
  })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error("Cron run not found")
  return {
    ...row,
    logs: Array.isArray(row.logs) ? row.logs : [],
  } as unknown as RailwayCronRunDetail
}

export async function setRailwayCronEnabled(label: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.rpc(ADMIN_CRON_RPCS.setRailwayCronEnabled, {
    p_label: label,
    p_enabled: enabled,
  })
  if (error) throw error
}

export async function runRailwayCron(label: string): Promise<void> {
  const { error } = await supabase.functions.invoke(ADMIN_CRON_FUNCTIONS.runRailwayCron, {
    body: { label },
  })
  if (error) throw error
}

export async function runDueScrapes(): Promise<void> {
  const { error } = await supabase.rpc(ADMIN_CRON_RPCS.runDueScrapes)
  if (error) throw error
}
