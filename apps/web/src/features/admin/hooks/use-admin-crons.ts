import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { supabase } from "@/lib/supabase"
import type { CronJob, CronRun } from "./admin-types"

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
