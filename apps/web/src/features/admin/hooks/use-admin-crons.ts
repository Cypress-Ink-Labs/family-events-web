import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { supabase } from "@/lib/supabase"
import type { CronJob, CronRun, RailwayCronJob, RailwayCronRun } from "./admin-types"

export function useAdminCronJobs() {
  return useQuery({
    queryKey: qk.admin.cronJobs,
    queryFn: async (): Promise<CronJob[]> => {
      const { data, error } = await supabase.rpc("admin_list_cron_jobs")
      if (error) throw error
      return (data ?? []) as CronJob[]
    },
    refetchInterval: 30_000,
  })
}

export function useAdminCronHistory(jobName?: string) {
  return useQuery({
    queryKey: qk.admin.cronHistory(jobName),
    queryFn: async (): Promise<CronRun[]> => {
      const { data, error } = await supabase.rpc("admin_cron_run_history", {
        // Generated RPC types model "default NULL" params as undefined.
        p_job_name: jobName ?? undefined,
        p_limit: 50,
      })
      if (error) throw error
      return (data ?? []) as CronRun[]
    },
    refetchInterval: 30_000,
  })
}

export function useToggleCronJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ jobName, active }: { jobName: string; active: boolean }) => {
      const { error } = await supabase.rpc("admin_toggle_cron_job", {
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
      const { error } = await supabase.rpc("admin_set_cron_schedule", {
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
      const { data, error } = await supabase.rpc("admin_list_railway_cron_jobs")
      if (error) throw error
      return (data ?? []) as RailwayCronJob[]
    },
    refetchInterval: 30_000,
  })
}

export function useAdminRailwayCronHistory(label?: string) {
  return useQuery({
    queryKey: qk.admin.railwayCronHistory(label),
    queryFn: async (): Promise<RailwayCronRun[]> => {
      const { data, error } = await supabase.rpc("admin_railway_cron_run_history", {
        p_label: label ?? undefined,
        p_limit: 50,
      })
      if (error) throw error
      return (data ?? []) as RailwayCronRun[]
    },
    refetchInterval: 30_000,
  })
}

export function useRunDueScrapes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("admin_run_due_scrapes")
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.sources })
      void queryClient.invalidateQueries({ queryKey: qk.admin.sourceRuns })
      void queryClient.invalidateQueries({ queryKey: qk.admin.cronHistory() })
    },
  })
}
