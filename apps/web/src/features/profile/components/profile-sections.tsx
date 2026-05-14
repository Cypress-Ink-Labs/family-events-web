import { useState } from "react"
import { Link } from "react-router-dom"
import { KeyRound, LogOut, Monitor, Moon, Shield, Sun, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { humanizeSupabaseError } from "@/lib/humanize-supabase-error"
import { toast } from "sonner"
import type { CityRow as City } from "@/lib/db"
type ThemeOption = "light" | "dark" | "system"

interface ProfileGuestStateProps {
  signInHref: string
}

export function ProfileGuestState({ signInHref }: ProfileGuestStateProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-20 text-center">
      <User className="size-16 text-muted-foreground/30 mx-auto mb-6" />
      <h1 className="text-2xl font-semibold text-foreground mb-2">Your Profile</h1>
      <p className="text-muted-foreground mb-6">Sign in to manage your profile and preferences.</p>
      <Button asChild>
        <Link to={signInHref}>Sign In</Link>
      </Button>
    </div>
  )
}

interface ProfileUserSummaryProps {
  displayName?: string | null
  email?: string | null
  avatarUrl?: string | null
  isAdmin: boolean
}

export function ProfileUserSummary({
  displayName,
  email,
  avatarUrl,
  isAdmin,
}: ProfileUserSummaryProps) {
  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-16 border-2 border-primary/20">
        <AvatarImage src={avatarUrl || undefined} />
        <AvatarFallback className="text-xl bg-primary text-primary-foreground font-bold">
          {displayName?.charAt(0)?.toUpperCase() ?? "U"}
        </AvatarFallback>
      </Avatar>
      <div>
        <h2 className="text-lg font-semibold text-foreground">{displayName}</h2>
        <p className="text-sm text-muted-foreground">{email}</p>
        {isAdmin && (
          <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-primary">
            <Shield className="size-3" />
            Admin
          </span>
        )}
      </div>
    </div>
  )
}

interface ProfileThemeCardProps {
  theme: ThemeOption
  onThemeChange: (value: ThemeOption) => void
}

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const satisfies { value: ThemeOption; label: string; icon: typeof Sun }[]

export function ProfileThemeCard({ theme, onThemeChange }: ProfileThemeCardProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Appearance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onThemeChange(value)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                theme === value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/40 text-muted-foreground"
              }`}
            >
              <Icon className="size-5" />
              {label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface ProfileChangePasswordCardProps {
  email: string
  onUpdatePassword: (newPassword: string) => Promise<{ error: Error | null }>
}

// Verifies the current password before allowing a change. Supabase's
// updateUser({password}) accepts any password from an authenticated session,
// so without this gate a stolen/forgotten-open session could rotate the
// password unchallenged. signInWithPassword silently refreshes the token if
// the credential matches; on success we proceed with the change.
export function ProfileChangePasswordCard({
  email,
  onUpdatePassword,
}: ProfileChangePasswordCardProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)

  function reset() {
    setCurrentPassword("")
    setNewPassword("")
    setConfirm("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters")
      return
    }
    if (newPassword !== confirm) {
      toast.error("New passwords don't match")
      return
    }
    if (newPassword === currentPassword) {
      toast.error("New password must differ from the current one")
      return
    }

    setLoading(true)
    const verify = await supabase.auth.signInWithPassword({ email, password: currentPassword })
    if (verify.error) {
      setLoading(false)
      toast.error("Current password is incorrect", {
        description: humanizeSupabaseError(verify.error, "Try again."),
      })
      return
    }

    const { error } = await onUpdatePassword(newPassword)
    setLoading(false)
    if (error) {
      toast.error("Couldn't update password", {
        description: humanizeSupabaseError(error, "Try again."),
      })
      return
    }
    reset()
    toast.success("Password updated")
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" />
          Change Password
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 6 characters"
              minLength={6}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function ProfileAdminLink({ href }: { href: string }) {
  return (
    <Button variant="outline" className="w-full gap-2 border-primary text-primary" asChild>
      <Link to={href}>
        <Shield className="size-4" />
        Open Admin Dashboard
      </Link>
    </Button>
  )
}

export function ProfileSignOutButton({ onSignOut }: { onSignOut: () => void }) {
  return (
    <Button variant="destructive" className="w-full gap-2" onClick={onSignOut}>
      <LogOut className="size-4" />
      Sign Out
    </Button>
  )
}

export function resolveSelectedCity(cities: City[], cityId: string) {
  return cities.find((city) => city.id === cityId)
}
