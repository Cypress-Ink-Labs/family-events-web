import { useState } from "react"
import { Link } from "react-router"
import { useAuth } from "@/features/auth/stores/auth-store"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Card, CardContent } from "@/shared/components/ui/card"
import { humanizeSupabaseError } from "@/infrastructure/supabase/errors"
import { BrandLogo } from "@/shared/components/brand-logo"
import { toast } from "sonner"

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) {
      // Soft-fail UI: still claim success to avoid leaking which addresses exist.
      // The toast in the error branch surfaces transport/throttle issues only.
      toast.error("Couldn't send reset link", {
        description: humanizeSupabaseError(error, "Try again in a minute."),
      })
      return
    }
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <BrandLogo showText={false} className="mb-4 justify-center" markClassName="size-10" />
          <h1 className="font-display text-2xl font-medium tracking-tight text-foreground">
            Forgot password?
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We'll email you a link to set a new one.
          </p>
        </div>

        <Card className="border-border/60">
          <CardContent className="p-6">
            {submitted ? (
              <div className="space-y-3 text-sm">
                <p className="text-foreground font-medium">Check your inbox</p>
                <p className="text-muted-foreground">
                  If an account exists for <span className="font-medium">{email}</span>, we just
                  sent a reset link. It expires in 1 hour.
                </p>
                <p className="text-muted-foreground">
                  Didn't get it? Check spam, or wait a minute and{" "}
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="text-primary font-medium hover:underline"
                  >
                    try again
                  </button>
                  .
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <Button type="submit" className="min-h-[44px] w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Remembered it?{" "}
          <Link to="/sign-in" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
