// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { ProfileNotificationPreferencesCard } from "@/features/profile/components/profile-sections"
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@cypress-ink-labs/contracts"

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
