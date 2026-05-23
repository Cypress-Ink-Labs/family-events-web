import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ADMIN_CRON_REFETCH_INTERVAL_MS } from "@/features/admin/constants/cron"
import { qk } from "@/infrastructure/queries/query-keys"
import {
  fetchCronHistory,
  fetchRailwayCronHistory,
  listCronJobs,
  listRailwayCronJobs,
  runDueScrapes,
  setCronSchedule,
  setRailwayCronEnabled,
  toggleCronJob,
} from "@/features/admin/api/crons"

export function useAdminCronJobs() {
  return useQuery({
    queryKey: qk.admin.cronJobs,
    queryFn: listCronJobs,
    refetchInterval: ADMIN_CRON_REFETCH_INTERVAL_MS,
  })
}

export function useAdminCronHistory(jobName?: string) {
  return useQuery({
    queryKey: qk.admin.cronHistory(jobName),
    queryFn: () => fetchCronHistory(jobName),
    refetchInterval: ADMIN_CRON_REFETCH_INTERVAL_MS,
  })
}

export function useToggleCronJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobName, active }: { jobName: string; active: boolean }) =>
      toggleCronJob(jobName, active),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.cronJobs })
    },
  })
}

export function useSetCronSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobName, schedule }: { jobName: string; schedule: string }) =>
      setCronSchedule(jobName, schedule),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.cronJobs })
    },
  })
}

export function useAdminRailwayCronJobs() {
  return useQuery({
    queryKey: qk.admin.railwayCronJobs,
    queryFn: listRailwayCronJobs,
    refetchInterval: ADMIN_CRON_REFETCH_INTERVAL_MS,
  })
}

export function useAdminRailwayCronHistory(label?: string) {
  return useQuery({
    queryKey: qk.admin.railwayCronHistory(label),
    queryFn: () => fetchRailwayCronHistory(label),
    refetchInterval: ADMIN_CRON_REFETCH_INTERVAL_MS,
  })
}

export function useToggleRailwayCron() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ label, enabled }: { label: string; enabled: boolean }) =>
      setRailwayCronEnabled(label, enabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.railwayCronJobs })
    },
  })
}

export function useRunDueScrapes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: runDueScrapes,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.sources })
      void queryClient.invalidateQueries({ queryKey: qk.admin.sourceRuns })
      void queryClient.invalidateQueries({ queryKey: qk.admin.cronHistory() })
    },
  })
}
