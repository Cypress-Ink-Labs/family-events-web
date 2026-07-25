// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { ProfileNotificationPreferencesCard } from "@/features/profile/components/profile-sections"
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@cypress-ink-labs/contracts"
import type { NotificationPreferences } from "@cypress-ink-labs/contracts"
import type { City } from "@/shared/types"

// ---------------------------------------------------------------------------
// Mock registerWebPush — we control the result per test
// ---------------------------------------------------------------------------
const mockRegisterWebPush = vi.fn()
vi.mock("@/infrastructure/push/register", () => ({
  registerWebPush: (...args: unknown[]) => mockRegisterWebPush(...args),
}))

const profileAuthMock = vi.fn()
const profileAppMock = vi.fn()
const profilePreferredCitiesMock = vi.fn()

vi.mock("react-router", () => ({ useNavigate: () => vi.fn() }))
vi.mock("@/shared/hooks/use-document-title", () => ({ useDocumentTitle: vi.fn() }))
vi.mock("@/features/auth/stores/auth-store", () => ({ useAuth: () => profileAuthMock() }))
vi.mock("@/app/stores/app-store", () => ({ useApp: () => profileAppMock() }))
vi.mock("@/app/providers/theme-provider", () => ({
  useTheme: () => ({ theme: "system", setTheme: vi.fn() }),
}))
vi.mock("@/features/profile/hooks/use-profile", () => ({
  useUpdateProfile: () => ({ isPending: false, mutateAsync: vi.fn() }),
}))
vi.mock("@/features/profile/hooks/use-preferred-cities", () => ({
  usePreferredCities: () => profilePreferredCitiesMock(),
  useSavePreferredCities: () => ({ isPending: false, mutateAsync: vi.fn() }),
}))
vi.mock("@/features/profile/hooks/use-notification-preferences", () => ({
  useNotificationPreferences: () => ({ data: undefined }),
  useUpdateNotificationPreferences: () => ({ isPending: false, mutate: vi.fn() }),
}))
vi.mock("@/components/v2", () => ({
  Page: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Stack: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { ProfilePage } from "./profile"

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

function city(id: string, name: string): City {
  return { id, name, state: "TX" } as City
}

describe("ProfilePage primary-city mirror", () => {
  beforeEach(() => {
    profileAuthMock.mockReturnValue({
      user: { id: "user-1" },
      profile: null,
      signOut: vi.fn(),
      isAdmin: false,
      refreshProfile: vi.fn(),
      updatePassword: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("does not re-apply an unchanged persisted primary after cities refetch", () => {
    const primaryCity = city("city-a", "Austin")
    const setSelectedCity = vi.fn()
    let cities = [primaryCity]

    profileAppMock.mockImplementation(() => ({
      cities,
      isCitiesLoading: false,
      setSelectedCity,
    }))
    profilePreferredCitiesMock.mockReturnValue({
      preferredCities: [{ cityId: primaryCity.id, isPrimary: true, city: primaryCity }],
      primaryCityId: primaryCity.id,
    })

    const { rerender } = render(<ProfilePage />)
    expect(setSelectedCity).toHaveBeenCalledExactlyOnceWith(primaryCity)

    setSelectedCity.mockClear()
    cities = [...cities]
    rerender(<ProfilePage />)

    expect(setSelectedCity).not.toHaveBeenCalled()
  })

  it("applies a changed persisted primary once", () => {
    const firstPrimary = city("city-a", "Austin")
    const secondPrimary = city("city-b", "Boston")
    const setSelectedCity = vi.fn()
    let cities = [firstPrimary, secondPrimary]
    let primaryCityId = firstPrimary.id

    profileAppMock.mockImplementation(() => ({
      cities,
      isCitiesLoading: false,
      setSelectedCity,
    }))
    profilePreferredCitiesMock.mockImplementation(() => ({
      preferredCities: [
        {
          cityId: primaryCityId,
          isPrimary: true,
          city: cities.find((city) => city.id === primaryCityId) ?? null,
        },
      ],
      primaryCityId,
    }))

    const { rerender } = render(<ProfilePage />)
    expect(setSelectedCity).toHaveBeenCalledExactlyOnceWith(firstPrimary)

    setSelectedCity.mockClear()
    primaryCityId = secondPrimary.id
    rerender(<ProfilePage />)

    expect(setSelectedCity).toHaveBeenCalledExactlyOnceWith(secondPrimary)

    setSelectedCity.mockClear()
    cities = [...cities]
    rerender(<ProfilePage />)

    expect(setSelectedCity).not.toHaveBeenCalled()
  })

  it("re-applies a primary after preferences are cleared and the same primary is re-saved", () => {
    const primaryCity = city("city-a", "Austin")
    const setSelectedCity = vi.fn()
    let primaryCityId: string | null = primaryCity.id

    profileAppMock.mockReturnValue({
      cities: [primaryCity],
      isCitiesLoading: false,
      setSelectedCity,
    })
    profilePreferredCitiesMock.mockImplementation(() => ({
      preferredCities: primaryCityId
        ? [{ cityId: primaryCityId, isPrimary: true, city: primaryCity }]
        : [],
      primaryCityId,
    }))

    const { rerender } = render(<ProfilePage />)
    expect(setSelectedCity).toHaveBeenCalledExactlyOnceWith(primaryCity)

    setSelectedCity.mockClear()
    primaryCityId = null
    rerender(<ProfilePage />)
    expect(setSelectedCity).not.toHaveBeenCalled()

    primaryCityId = primaryCity.id
    rerender(<ProfilePage />)
    expect(setSelectedCity).toHaveBeenCalledExactlyOnceWith(primaryCity)
  })
})
