import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { useDocumentTitle } from "@/shared/hooks/use-document-title"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Separator } from "@/shared/components/ui/separator"
import {
  ProfileAdminLink,
  ProfileChangePasswordCard,
  ProfileGuestState,
  ProfileNotificationPreferencesCard,
  ProfileSignOutButton,
  ProfileThemeCard,
  ProfileUserSummary,
} from "@/features/profile/components/profile-sections"
import { ProfilePreferredCitiesCard } from "@/features/profile/components/profile-preferred-cities-card"
import { useAuth } from "@/features/auth/stores/auth-store"
import { useApp } from "@/app/stores/app-store"
import { useTheme } from "@/app/providers/theme-provider"
import { useUpdateProfile } from "@/features/profile/hooks/use-profile"
import {
  usePreferredCities,
  useSavePreferredCities,
} from "@/features/profile/hooks/use-preferred-cities"
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/features/profile/hooks/use-notification-preferences"
import { humanizeSupabaseError } from "@/infrastructure/supabase/errors"
import { registerWebPush } from "@/infrastructure/push/register"
import { toast } from "sonner"
import { Page, Stack } from "@/components/v2"
import type { NotificationPreferences } from "@cypress-ink-labs/contracts"

export function ProfilePage() {
  const { user, profile, signOut, isAdmin, refreshProfile, updatePassword } = useAuth()
  const { setSelectedCity, cities, isCitiesLoading } = useApp()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const updateProfile = useUpdateProfile(user?.id)
  const { data: notifPrefs } = useNotificationPreferences(user?.id)
  const updateNotifPrefs = useUpdateNotificationPreferences(user?.id)
  const { preferredCities, primaryCityId: persistedPrimaryId } = usePreferredCities(user?.id)
  const savePreferredCities = useSavePreferredCities(user?.id)

  useDocumentTitle("Profile")

  const [displayNameDraft, setDisplayNameDraft] = useState<string | null>(null)
  const [childNameDraft, setChildNameDraft] = useState<string | null>(null)
  const [childAgeDraft, setChildAgeDraft] = useState<string | null>(null)
  // null = follow the server-resolved set; arrays = local edits awaiting save.
  const [cityIdsDraft, setCityIdsDraft] = useState<string[] | null>(null)
  const [primaryIdDraft, setPrimaryIdDraft] = useState<string | null | undefined>(undefined)

  const displayName = displayNameDraft ?? profile?.display_name ?? ""
  const childName = childNameDraft ?? profile?.child_name ?? ""
  const childAge = childAgeDraft ?? profile?.child_age?.toString() ?? ""

  const persistedCityIds = useMemo(
    () => preferredCities.map((entry) => entry.cityId),
    [preferredCities]
  )
  const selectedCityIds = cityIdsDraft ?? persistedCityIds
  const primaryCityId = primaryIdDraft === undefined ? persistedPrimaryId : primaryIdDraft

  const isCitiesDirty = useMemo(() => {
    const persistedSet = [...persistedCityIds].toSorted()
    const draftSet = [...selectedCityIds].toSorted()
    const setChanged =
      persistedSet.length !== draftSet.length ||
      persistedSet.some((id, index) => id !== draftSet[index])
    return setChanged || primaryCityId !== persistedPrimaryId
  }, [persistedCityIds, selectedCityIds, primaryCityId, persistedPrimaryId])
  const lastAppliedPrimaryId = useRef<string | null>(null)

  // Keep the app-store selection coherent with the persisted primary so the
  // rest of the app (default view) reflects the user's primary city.
  useEffect(() => {
    if (!persistedPrimaryId) {
      lastAppliedPrimaryId.current = null
      return
    }
    if (persistedPrimaryId === lastAppliedPrimaryId.current) return
    const primaryCity = cities.find((city) => city.id === persistedPrimaryId)
    if (primaryCity) {
      setSelectedCity(primaryCity)
      lastAppliedPrimaryId.current = persistedPrimaryId
    }
  }, [persistedPrimaryId, cities, setSelectedCity])

  function handleAddCity(cityId: string) {
    setCityIdsDraft((current) => {
      const base = current ?? persistedCityIds
      if (base.includes(cityId)) return base
      return [...base, cityId]
    })
    // First city added with no primary chosen becomes the primary by default.
    setPrimaryIdDraft((current) => {
      const resolved = current === undefined ? persistedPrimaryId : current
      return resolved ?? cityId
    })
  }

  function handleRemoveCity(cityId: string) {
    setCityIdsDraft((current) => (current ?? persistedCityIds).filter((id) => id !== cityId))
    setPrimaryIdDraft((current) => {
      const resolved = current === undefined ? persistedPrimaryId : current
      if (resolved !== cityId) return resolved
      // Removing the primary: promote the first remaining city, if any.
      const remaining = (cityIdsDraft ?? persistedCityIds).filter((id) => id !== cityId)
      return remaining[0] ?? null
    })
  }

  function handleSetPrimary(cityId: string) {
    setPrimaryIdDraft(cityId)
  }

  async function handleSignOut() {
    await signOut()
    navigate("/sign-in")
  }

  async function handleSaveProfile() {
    if (!user) {
      return
    }

    try {
      await updateProfile.mutateAsync({
        display_name: displayName.trim() || null,
        child_name: childName.trim() || null,
        child_age: childAge.trim() ? Number(childAge) : null,
      })
      await refreshProfile()
      setDisplayNameDraft(null)
      setChildNameDraft(null)
      setChildAgeDraft(null)
      toast.success("Profile updated!")
    } catch (error) {
      toast.error(humanizeSupabaseError(error, "Failed to update profile."))
    }
  }

  async function handleSavePreferredCities() {
    if (!user || !primaryCityId || selectedCityIds.length === 0) {
      return
    }

    try {
      await savePreferredCities.mutateAsync({
        cityIds: selectedCityIds,
        primaryCityId,
      })
      await refreshProfile()
      const primaryCity = cities.find((city) => city.id === primaryCityId)
      if (primaryCity) setSelectedCity(primaryCity)
      setCityIdsDraft(null)
      setPrimaryIdDraft(undefined)
      toast.success("Preferred cities updated!")
    } catch (error) {
      toast.error(humanizeSupabaseError(error, "Failed to update preferred cities."))
    }
  }

  async function handleNotificationToggle(field: keyof NotificationPreferences, value: boolean) {
    if (!notifPrefs) return

    if (value && field.endsWith("_push")) {
      const result = await registerWebPush()
      switch (result.status) {
        case "subscribed":
          break
        case "denied":
          toast.error("Push notifications blocked", {
            description: "Enable notifications for this site in your browser settings.",
          })
          return
        case "unsupported":
          toast.error("Push isn't supported in this browser.")
          return
        case "no-vapid-key":
          toast.error("Push isn't configured.", {
            description: "Missing VAPID key — contact support.",
          })
          return
        case "error":
          toast.error("Couldn't enable push", { description: result.error })
          return
      }
    }

    const updated = { ...notifPrefs, [field]: value }
    updateNotifPrefs.mutate(updated, {
      onSuccess: () => toast.success("Notification preference updated"),
      onError: (error) =>
        toast.error(humanizeSupabaseError(error, "Failed to update notification preferences.")),
    })
  }

  if (!user) {
    return <ProfileGuestState signInHref="/sign-in" />
  }

  return (
    <Page width="content" className="max-w-xl py-6">
      <Stack gap="5">
        <h1 className="font-display text-2xl font-medium tracking-tight text-foreground">
          Profile
        </h1>

        {/* User summary */}
        <ProfileUserSummary
          displayName={profile?.display_name}
          email={profile?.email}
          avatarUrl={profile?.avatar_url}
          isAdmin={isAdmin}
        />

        {/* Profile settings */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Personal Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Your Name</Label>
              <Input value={displayName} onChange={(e) => setDisplayNameDraft(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Child's Name (optional)</Label>
              <Input
                value={childName}
                onChange={(e) => setChildNameDraft(e.target.value)}
                placeholder="e.g. Leo"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Child&apos;s Age (optional)</Label>
              <Input
                type="number"
                min={0}
                max={18}
                value={childAge}
                onChange={(e) => setChildAgeDraft(e.target.value)}
                placeholder="e.g. 3"
              />
            </div>
            <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Preferred cities */}
        <ProfilePreferredCitiesCard
          cities={cities}
          selectedCityIds={selectedCityIds}
          primaryCityId={primaryCityId}
          isCitiesLoading={isCitiesLoading}
          isSaving={savePreferredCities.isPending}
          isDirty={isCitiesDirty}
          onAddCity={handleAddCity}
          onRemoveCity={handleRemoveCity}
          onSetPrimary={handleSetPrimary}
          onSave={handleSavePreferredCities}
        />

        {/* Security */}
        {user.email && (
          <ProfileChangePasswordCard email={user.email} onUpdatePassword={updatePassword} />
        )}

        {/* Notification preferences */}
        {notifPrefs && (
          <ProfileNotificationPreferencesCard
            preferences={notifPrefs}
            isPending={updateNotifPrefs.isPending}
            onToggle={handleNotificationToggle}
          />
        )}

        {/* Theme */}
        <ProfileThemeCard theme={theme} onThemeChange={setTheme} />

        {/* Admin link */}
        {isAdmin && <ProfileAdminLink href="/admin" />}

        <Separator />

        <ProfileSignOutButton onSignOut={handleSignOut} />

        <p className="text-xs text-muted-foreground">
          Some event photos courtesy of{" "}
          <a
            className="underline underline-offset-2 hover:text-foreground"
            href="https://unsplash.com/?utm_source=family_events&utm_medium=referral"
            target="_blank"
            rel="noopener noreferrer"
          >
            Unsplash
          </a>
          .
        </p>
      </Stack>
    </Page>
  )
}
