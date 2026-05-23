import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/features/auth/stores/auth-store"
import { resolveInAppRedirectTarget } from "@/shared/access-control"
import { FadeSwap } from "@/shared/components/motion"

export function PublicOnlyRoute() {
  const { user, isEnabled, isLoading } = useAuth()
  const location = useLocation()
  const redirectTo = resolveInAppRedirectTarget((location.state as { from?: unknown } | null)?.from)

  if (isLoading) {
    return (
      <FadeSwap stateKey="public-loading">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </FadeSwap>
    )
  }

  if (user && isEnabled) {
    return <Navigate to={redirectTo} replace />
  }

  return (
    <FadeSwap stateKey="public-content">
      <Outlet />
    </FadeSwap>
  )
}
