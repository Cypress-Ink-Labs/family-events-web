import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  ADMIN_CRON_FUNCTIONS,
  ADMIN_CRON_HISTORY_LIMIT,
  ADMIN_CRON_RPCS,
} from "@/features/admin/constants/cron"
import { qk } from "@/infrastructure/queries/query-keys"

const { mockInvoke, mockRpc, mockInvalidateQueries, mockUseMutation, mockUseQuery } = vi.hoisted(
  () => ({
    mockInvoke: vi.fn(),
    mockRpc: vi.fn(),
    mockInvalidateQueries: vi.fn(),
    mockUseMutation: vi.fn((options: unknown) => options),
    mockUseQuery: vi.fn((options: unknown) => options),
  })
)

vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: { functions: { invoke: mockInvoke }, rpc: mockRpc },
}))

vi.mock("@tanstack/react-query", () => ({
  useMutation: mockUseMutation,
  useQuery: mockUseQuery,
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}))

type MutationOptions<TVariables = void> = {
  mutationFn: (variables: TVariables) => Promise<void>
  onSuccess?: (data?: void, variables?: TVariables) => void
}

type QueryOptions<TData> = {
  queryFn: () => Promise<TData>
}

async function loadCronHooks() {
  return await import("./use-admin-crons")
}

beforeEach(() => {
  vi.resetModules()
  mockInvoke.mockReset()
  mockRpc.mockReset()
  mockInvalidateQueries.mockReset()
  mockUseMutation.mockClear()
  mockUseQuery.mockClear()
  mockInvoke.mockResolvedValue({ data: {}, error: null })
  mockRpc.mockResolvedValue({ data: [], error: null })
})

describe("admin cron hooks", () => {
  it("loads pg_cron history with the expected RPC params", async () => {
    const { useAdminCronHistory } = await loadCronHooks()

    const query = useAdminCronHistory("source-refresh") as unknown as QueryOptions<unknown[]>
    await query.queryFn()

    expect(mockRpc).toHaveBeenCalledWith(ADMIN_CRON_RPCS.cronRunHistory, {
      p_job_name: "source-refresh",
      p_limit: ADMIN_CRON_HISTORY_LIMIT,
    })
  })

  it("loads Railway cron history with the expected RPC params", async () => {
    const { useAdminRailwayCronHistory } = await loadCronHooks()

    const query = useAdminRailwayCronHistory("tag-queue") as unknown as QueryOptions<unknown[]>
    await query.queryFn()

    expect(mockRpc).toHaveBeenCalledWith(ADMIN_CRON_RPCS.railwayCronRunHistory, {
      p_label: "tag-queue",
      p_limit: ADMIN_CRON_HISTORY_LIMIT,
    })
  })

  it("toggles pg_cron jobs and invalidates the cron job cache", async () => {
    const { useToggleCronJob } = await loadCronHooks()

    const mutation = useToggleCronJob() as unknown as MutationOptions<{
      jobName: string
      active: boolean
    }>
    await mutation.mutationFn({ jobName: "source-refresh", active: false })
    mutation.onSuccess?.()

    expect(mockRpc).toHaveBeenCalledWith(ADMIN_CRON_RPCS.toggleCronJob, {
      p_job_name: "source-refresh",
      p_active: false,
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: qk.admin.cronJobs })
  })

  it("updates pg_cron schedules and invalidates the cron job cache", async () => {
    const { useSetCronSchedule } = await loadCronHooks()

    const mutation = useSetCronSchedule() as unknown as MutationOptions<{
      jobName: string
      schedule: string
    }>
    await mutation.mutationFn({ jobName: "source-refresh", schedule: "*/5 * * * *" })
    mutation.onSuccess?.()

    expect(mockRpc).toHaveBeenCalledWith(ADMIN_CRON_RPCS.setCronSchedule, {
      p_job_name: "source-refresh",
      p_schedule: "*/5 * * * *",
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: qk.admin.cronJobs })
  })

  it("toggles Railway cron jobs and invalidates the Railway cron job cache", async () => {
    const { useToggleRailwayCron } = await loadCronHooks()

    const mutation = useToggleRailwayCron() as unknown as MutationOptions<{
      label: string
      enabled: boolean
    }>
    await mutation.mutationFn({ label: "tag-queue", enabled: true })
    mutation.onSuccess?.()

    expect(mockRpc).toHaveBeenCalledWith(ADMIN_CRON_RPCS.setRailwayCronEnabled, {
      p_label: "tag-queue",
      p_enabled: true,
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: qk.admin.railwayCronJobs })
  })

  it("runs Railway cron jobs and invalidates Railway cron caches", async () => {
    const { useRunRailwayCron } = await loadCronHooks()

    const mutation = useRunRailwayCron() as unknown as MutationOptions<{
      label: string
    }>
    await mutation.mutationFn({ label: "cron-tag-queue" })
    mutation.onSuccess?.(undefined, { label: "cron-tag-queue" })

    expect(mockInvoke).toHaveBeenCalledWith(ADMIN_CRON_FUNCTIONS.runRailwayCron, {
      body: { label: "cron-tag-queue" },
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: qk.admin.railwayCronJobs })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: qk.admin.railwayCronHistory(),
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: qk.admin.railwayCronHistory("cron-tag-queue"),
    })
  })

  it("runs due scrapes and invalidates source/run/history caches", async () => {
    const { useRunDueScrapes } = await loadCronHooks()

    const mutation = useRunDueScrapes() as unknown as MutationOptions
    await mutation.mutationFn()
    mutation.onSuccess?.()

    expect(mockRpc).toHaveBeenCalledWith(ADMIN_CRON_RPCS.runDueScrapes)
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: qk.admin.sources })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: qk.admin.sourceRuns })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: qk.admin.cronHistory() })
  })
})
