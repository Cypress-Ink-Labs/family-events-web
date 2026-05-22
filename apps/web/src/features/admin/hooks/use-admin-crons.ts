import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ADMIN_CRON_HISTORY_LIMIT,
  ADMIN_CRON_REFETCH_INTERVAL_MS,
  ADMIN_CRON_RPCS,
} from "@/features/admin/constants/cron"
import { qk } from "@/lib/query-keys"
import { supabase } from "@/lib/supabase"
import type { CronJob, CronRun, RailwayCronJob, RailwayCronRun } from "./admin-types"

export function useAdminCronJobs() {
  return useQuery({
    queryKey: qk.admin.cronJobs,
    queryFn: async (): Promise<CronJob[]> => {
      const { data, error } = await supabase.rpc(ADMIN_CRON_RPCS.listCronJobs)
      if (error) throw error
      return (data ?? []) as CronJob[]
    },
    refetchInterval: ADMIN_CRON_REFETCH_INTERVAL_MS,
  })
}

export function useAdminCronHistory(jobName?: string) {
  return useQuery({
    queryKey: qk.admin.cronHistory(jobName),
    queryFn: async (): Promise<CronRun[]> => {
      const { data, error } = await supabase.rpc(ADMIN_CRON_RPCS.cronRunHistory, {
        // Generated RPC types model "default NULL" params as undefined.
        p_job_name: jobName ?? undefined,
        p_limit: ADMIN_CRON_HISTORY_LIMIT,
      })
      if (error) throw error
      return (data ?? []) as CronRun[]
    },
    refetchInterval: ADMIN_CRON_REFETCH_INTERVAL_MS,
  })
}

export function useToggleCronJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ jobName, active }: { jobName: string; active: boolean }) => {
      const { error } = await supabase.rpc(ADMIN_CRON_RPCS.toggleCronJob, {
        p_job_name: jobName,
        p_active: active,
      })
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.cronJobs })
    },
  })
}

export function useSetCronSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ jobName, schedule }: { jobName: string; schedule: string }) => {
      const { error } = await supabase.rpc(ADMIN_CRON_RPCS.setCronSchedule, {
        p_job_name: jobName,
        p_schedule: schedule,
      })
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.cronJobs })
    },
  })
}

export function useAdminRailwayCronJobs() {
  return useQuery({
    queryKey: qk.admin.railwayCronJobs,
    queryFn: async (): Promise<RailwayCronJob[]> => {
      const { data, error } = await supabase.rpc(ADMIN_CRON_RPCS.listRailwayCronJobs)
      if (error) throw error
      return (data ?? []) as RailwayCronJob[]
    },
    refetchInterval: ADMIN_CRON_REFETCH_INTERVAL_MS,
  })
}

export function useAdminRailwayCronHistory(label?: string) {
  return useQuery({
    queryKey: qk.admin.railwayCronHistory(label),
    queryFn: async (): Promise<RailwayCronRun[]> => {
      const { data, error } = await supabase.rpc(ADMIN_CRON_RPCS.railwayCronRunHistory, {
        p_label: label ?? undefined,
        p_limit: ADMIN_CRON_HISTORY_LIMIT,
      })
      if (error) throw error
      return (data ?? []) as RailwayCronRun[]
    },
    refetchInterval: ADMIN_CRON_REFETCH_INTERVAL_MS,
  })
}

export function useToggleRailwayCron() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ label, enabled }: { label: string; enabled: boolean }) => {
      const { error } = await supabase.rpc(ADMIN_CRON_RPCS.setRailwayCronEnabled, {
        p_label: label,
        p_enabled: enabled,
      })
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.railwayCronJobs })
    },
  })
}

export function useRunDueScrapes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc(ADMIN_CRON_RPCS.runDueScrapes)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.sources })
      void queryClient.invalidateQueries({ queryKey: qk.admin.sourceRuns })
      void queryClient.invalidateQueries({ queryKey: qk.admin.cronHistory() })
    },
  })
}
