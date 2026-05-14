import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ProfileAdminLink,
  ProfileChangePasswordCard,
  ProfileGuestState,
  ProfileSignOutButton,
  ProfileThemeCard,
  ProfileUserSummary,
  resolveSelectedCity,
} from "@/features/profile/components/profile-sections"
import { useAuth } from "@/features/auth/stores/auth-store"
import { useApp } from "@/app/stores/app-store"
import { useTheme } from "@/app/providers/theme-provider"
import { useUpdateProfile } from "@/features/profile/hooks/use-profile"
import { humanizeSupabaseError } from "@/lib/humanize-supabase-error"
import { toast } from "sonner"

export function ProfilePage() {
  const { user, profile, signOut, isAdmin, refreshProfile, updatePassword } = useAuth()
  const { selectedCity, setSelectedCity, cities, isCitiesLoading } = useApp()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const updateProfile = useUpdateProfile(user?.id)

  const [displayNameDraft, setDisplayNameDraft] = useState<string | null>(null)
  const [childNameDraft, setChildNameDraft] = useState<string | null>(null)
  const [childAgeDraft, setChildAgeDraft] = useState<string | null>(null)

  const displayName = displayNameDraft ?? profile?.display_name ?? ""
  const childName = childNameDraft ?? profile?.child_name ?? ""
  const childAge = childAgeDraft ?? profile?.child_age?.toString() ?? ""

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
        city_preference_id: selectedCity?.id ?? null,
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

  if (!user) {
    return <ProfileGuestState signInHref="/sign-in" />
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-extrabold text-foreground">Profile</h1>

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
          <div className="space-y-1.5">
            <Label>Preferred City</Label>
            <Select
              value={selectedCity?.id ?? ""}
              onValueChange={(val) => {
                const city = resolveSelectedCity(cities, val)
                if (city) setSelectedCity(city)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={isCitiesLoading ? "Loading cities..." : "Select city"} />
              </SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}, {c.state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      {user.email && (
        <ProfileChangePasswordCard email={user.email} onUpdatePassword={updatePassword} />
      )}

      {/* Theme */}
      <ProfileThemeCard theme={theme} onThemeChange={setTheme} />

      {/* Admin link */}
      {isAdmin && <ProfileAdminLink href="/admin" />}

      <Separator />

      <ProfileSignOutButton onSignOut={handleSignOut} />
    </div>
  )
}
