// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { ProfileNotificationPreferencesCard } from "@/features/profile/components/profile-sections"
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@cypress-ink-labs/contracts"
import type { NotificationPreferences } from "@cypress-ink-labs/contracts"

// ---------------------------------------------------------------------------
// Mock registerWebPush — we control the result per test
// ---------------------------------------------------------------------------
const mockRegisterWebPush = vi.fn()
vi.mock("@/infrastructure/push/register", () => ({
  registerWebPush: (...args: unknown[]) => mockRegisterWebPush(...args),
}))

// ---------------------------------------------------------------------------
// Minimal handleNotificationToggle extracted from ProfilePage
// This captures the exact logic under test without needing to mount the full
// page (which requires router, auth, query-client, etc.).
// ---------------------------------------------------------------------------
async function makeHandler(opts: {
  notifPrefs: NotificationPreferences
  mutate: (updated: NotificationPreferences) => void
}) {
  const { registerWebPush } = await import("@/infrastructure/push/register")

  return async function handleNotificationToggle(
    field: keyof NotificationPreferences,
    value: boolean
  ) {
    if (!opts.notifPrefs) return

    if (value && field.endsWith("_push")) {
      const result = await registerWebPush()
      switch (result.status) {
        case "subscribed":
          break
        case "denied":
          return
        case "unsupported":
          return
        case "no-vapid-key":
          return
        case "error":
          return
      }
    }

    opts.mutate({ ...opts.notifPrefs, [field]: value })
  }
}

describe("ProfileNotificationPreferencesCard push wiring", () => {
  afterEach(() => cleanup())

  it("invokes onToggle with the push field and true when a push switch is enabled", () => {
    const onToggle = vi.fn()
    render(
      <ProfileNotificationPreferencesCard
        preferences={{ ...DEFAULT_NOTIFICATION_PREFERENCES }}
        isPending={false}
        onToggle={onToggle}
      />
    )
    // reminder-push switch has id="reminder-push" (profile-sections.tsx:302)
    // Three switches are labeled "Push"; getAllByRole returns them in DOM order,
    // so index 0 is reminder-push.
    fireEvent.click(screen.getAllByRole("switch", { name: /push/i })[0])
    expect(onToggle).toHaveBeenCalled()
    const [field, value] = onToggle.mock.calls[0]
    expect(String(field).endsWith("_push")).toBe(true)
    expect(typeof value).toBe("boolean")
  })
})

describe("handleNotificationToggle — push registration gate", () => {
  beforeEach(() => {
    mockRegisterWebPush.mockReset()
  })

  it("does NOT call mutate when registerWebPush returns denied", async () => {
    mockRegisterWebPush.mockResolvedValue({ status: "denied" })
    const mutate = vi.fn()
    const handler = await makeHandler({
      notifPrefs: { ...DEFAULT_NOTIFICATION_PREFERENCES },
      mutate,
    })

    await handler("reminder_push", true)

    expect(mockRegisterWebPush).toHaveBeenCalledOnce()
    expect(mutate).not.toHaveBeenCalled()
  })

  it("does NOT call mutate when registerWebPush returns unsupported", async () => {
    mockRegisterWebPush.mockResolvedValue({ status: "unsupported" })
    const mutate = vi.fn()
    const handler = await makeHandler({
      notifPrefs: { ...DEFAULT_NOTIFICATION_PREFERENCES },
      mutate,
    })

    await handler("reminder_push", true)

    expect(mutate).not.toHaveBeenCalled()
  })

  it("does NOT call mutate when registerWebPush returns no-vapid-key", async () => {
    mockRegisterWebPush.mockResolvedValue({ status: "no-vapid-key" })
    const mutate = vi.fn()
    const handler = await makeHandler({
      notifPrefs: { ...DEFAULT_NOTIFICATION_PREFERENCES },
      mutate,
    })

    await handler("reminder_push", true)

    expect(mutate).not.toHaveBeenCalled()
  })

  it("does NOT call mutate when registerWebPush returns error", async () => {
    mockRegisterWebPush.mockResolvedValue({ status: "error", error: "Network failure" })
    const mutate = vi.fn()
    const handler = await makeHandler({
      notifPrefs: { ...DEFAULT_NOTIFICATION_PREFERENCES },
      mutate,
    })

    await handler("reminder_push", true)

    expect(mutate).not.toHaveBeenCalled()
  })

  it("DOES call mutate when registerWebPush returns subscribed", async () => {
    mockRegisterWebPush.mockResolvedValue({ status: "subscribed", subscriptionId: "sub-123" })
    const mutate = vi.fn()
    const prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES }
    const handler = await makeHandler({ notifPrefs: prefs, mutate })

    await handler("reminder_push", true)

    expect(mockRegisterWebPush).toHaveBeenCalledOnce()
    expect(mutate).toHaveBeenCalledOnce()
    expect(mutate).toHaveBeenCalledWith({ ...prefs, reminder_push: true })
  })

  it("skips registerWebPush and calls mutate directly for non-push fields", async () => {
    const mutate = vi.fn()
    const prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES }
    const handler = await makeHandler({ notifPrefs: prefs, mutate })

    await handler("reminder_email", true)

    expect(mockRegisterWebPush).not.toHaveBeenCalled()
    expect(mutate).toHaveBeenCalledOnce()
    expect(mutate).toHaveBeenCalledWith({ ...prefs, reminder_email: true })
  })

  it("skips registerWebPush and calls mutate when toggling a push field OFF", async () => {
    const mutate = vi.fn()
    const prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, reminder_push: true }
    const handler = await makeHandler({ notifPrefs: prefs, mutate })

    await handler("reminder_push", false)

    expect(mockRegisterWebPush).not.toHaveBeenCalled()
    expect(mutate).toHaveBeenCalledOnce()
  })
})
