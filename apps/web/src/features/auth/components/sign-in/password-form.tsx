import { Link } from "react-router"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"

interface PasswordSignInFormProps {
  email: string
  password: string
  loading: boolean
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: React.FormEvent) => void
  onSwitchToMagic: () => void
}

export function PasswordSignInForm({
  email,
  password,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onSwitchToMagic,
}: PasswordSignInFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="password">Password</Label>
          <Link
            to="/forgot-password"
            className="text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            Forgot?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>
      <Button type="submit" className="min-h-[44px] w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign In"}
      </Button>
      <button
        type="button"
        onClick={onSwitchToMagic}
        className="block w-full text-center text-xs text-muted-foreground hover:text-primary hover:underline"
      >
        Email me a link instead
      </button>
    </form>
  )
}
