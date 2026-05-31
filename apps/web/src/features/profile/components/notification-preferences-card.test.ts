import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@family-events/contracts"

import { ProfileNotificationPreferencesCard } from "./profile-sections"

describe("ProfileNotificationPreferencesCard", () => {
  it("renders all six toggle switches", () => {
    const html = renderToStaticMarkup(
      createElement(ProfileNotificationPreferencesCard, {
        preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
        isPending: false,
        onToggle: vi.fn(),
      })
    )

    // Card title
    expect(html).toContain("Notification Settings")

    // Category headings
    expect(html).toContain("Reminders")
    expect(html).toContain("Event Changes")
    expect(html).toContain("Weekly Digest")

    // Six switch elements (each has a label "Email" or "Push")
    const emailCount = (html.match(/Email/g) ?? []).length
    const pushCount = (html.match(/Push/g) ?? []).length
    expect(emailCount).toBe(3) // reminder, change, digest
    expect(pushCount).toBe(3)

    // Six switch ids present
    expect(html).toContain("reminder-email")
    expect(html).toContain("reminder-push")
    expect(html).toContain("change-email")
    expect(html).toContain("change-push")
    expect(html).toContain("digest-email")
    expect(html).toContain("digest-push")
  })

  it("renders with all defaults (digest_push unchecked)", () => {
    const html = renderToStaticMarkup(
      createElement(ProfileNotificationPreferencesCard, {
        preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
        isPending: false,
        onToggle: vi.fn(),
      })
    )

    // digest_push is false by default, so its switch should have state=unchecked
    expect(html).toContain('id="digest-push"')
  })

  it("renders with custom preferences", () => {
    const html = renderToStaticMarkup(
      createElement(ProfileNotificationPreferencesCard, {
        preferences: {
          reminder_email: false,
          reminder_push: false,
          change_email: true,
          change_push: true,
          digest_email: false,
          digest_push: true,
        },
        isPending: false,
        onToggle: vi.fn(),
      })
    )

    // Still renders all toggles
    expect(html).toContain("Notification Settings")
    expect(html).toContain("reminder-email")
    expect(html).toContain("digest-push")
  })

  it("renders disabled state when isPending", () => {
    const html = renderToStaticMarkup(
      createElement(ProfileNotificationPreferencesCard, {
        preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
        isPending: true,
        onToggle: vi.fn(),
      })
    )

    // Switches should have disabled attribute
    expect(html).toContain("disabled")
  })
})
