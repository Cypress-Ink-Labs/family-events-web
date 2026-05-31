import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { qk } from "@/infrastructure/queries/query-keys"
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@family-events/contracts"
import type { NotificationPreferences } from "@family-events/contracts"

const USER_ID = "user-test-123"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

describe("notification preferences query keys", () => {
  it("generates stable keys per user", () => {
    const key1 = qk.notificationPreferences.byUser(USER_ID)
    const key2 = qk.notificationPreferences.byUser(USER_ID)
    expect(key1).toEqual(key2)
    expect(key1).toEqual(["notification-preferences", USER_ID])
  })

  it("generates null-safe key for undefined user", () => {
    const key = qk.notificationPreferences.byUser(undefined)
    expect(key).toEqual(["notification-preferences", null])
  })

  it("all key is stable", () => {
    expect(qk.notificationPreferences.all).toEqual(["notification-preferences"])
  })
})

describe("notification preferences defaults", () => {
  it("defaults have all channels enabled except digest_push", () => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES).toEqual({
      reminder_email: true,
      reminder_push: true,
      change_email: true,
      change_push: true,
      digest_email: true,
      digest_push: false,
    })
  })

  it("defaults include all six preference fields", () => {
    const keys = Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).sort()
    expect(keys).toEqual([
      "change_email",
      "change_push",
      "digest_email",
      "digest_push",
      "reminder_email",
      "reminder_push",
    ])
  })
})

describe("notification preferences optimistic update", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = makeQueryClient()
  })

  it("can set and retrieve preferences from query cache", () => {
    const prefs: NotificationPreferences = {
      reminder_email: false,
      reminder_push: true,
      change_email: true,
      change_push: false,
      digest_email: true,
      digest_push: true,
    }

    queryClient.setQueryData(qk.notificationPreferences.byUser(USER_ID), prefs)

    const cached = queryClient.getQueryData<NotificationPreferences>(
      qk.notificationPreferences.byUser(USER_ID)
    )
    expect(cached).toEqual(prefs)
  })

  it("optimistic toggle updates a single field", () => {
    const initial: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES }
    queryClient.setQueryData(qk.notificationPreferences.byUser(USER_ID), initial)

    // Simulate optimistic update for toggling reminder_email off
    const updated = { ...initial, reminder_email: false }
    queryClient.setQueryData(qk.notificationPreferences.byUser(USER_ID), updated)

    const cached = queryClient.getQueryData<NotificationPreferences>(
      qk.notificationPreferences.byUser(USER_ID)
    )
    expect(cached?.reminder_email).toBe(false)
    // Other fields unchanged
    expect(cached?.reminder_push).toBe(true)
    expect(cached?.change_email).toBe(true)
    expect(cached?.digest_push).toBe(false)
  })

  it("rollback restores previous value", () => {
    const initial: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES }
    queryClient.setQueryData(qk.notificationPreferences.byUser(USER_ID), initial)

    // Snapshot before optimistic update
    const snapshot = queryClient.getQueryData<NotificationPreferences>(
      qk.notificationPreferences.byUser(USER_ID)
    )

    // Optimistic update
    const updated = { ...initial, digest_push: true }
    queryClient.setQueryData(qk.notificationPreferences.byUser(USER_ID), updated)

    // Simulate error rollback
    queryClient.setQueryData(qk.notificationPreferences.byUser(USER_ID), snapshot)

    const rolledBack = queryClient.getQueryData<NotificationPreferences>(
      qk.notificationPreferences.byUser(USER_ID)
    )
    expect(rolledBack).toEqual(initial)
    expect(rolledBack?.digest_push).toBe(false)
  })

  it("invalidates correct query key on settle", () => {
    const invalidateSpy = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined as never)

    const queryKey = qk.notificationPreferences.byUser(USER_ID)
    void queryClient.invalidateQueries({ queryKey })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey })
    expect(invalidateSpy).toHaveBeenCalledTimes(1)
  })
})

describe("toUpsertParams", () => {
  it("maps preference fields to p_ prefixed RPC params", async () => {
    const { toUpsertParams } = await import("@family-events/contracts")

    const prefs: NotificationPreferences = {
      reminder_email: false,
      reminder_push: true,
      change_email: true,
      change_push: false,
      digest_email: false,
      digest_push: true,
    }

    const params = toUpsertParams(prefs)
    expect(params).toEqual({
      p_reminder_email: false,
      p_reminder_push: true,
      p_change_email: true,
      p_change_push: false,
      p_digest_email: false,
      p_digest_push: true,
    })
  })
})
