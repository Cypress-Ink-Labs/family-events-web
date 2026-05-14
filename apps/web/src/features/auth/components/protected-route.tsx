import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/features/auth/stores/auth-store"
import { FadeSwap } from "@/components/motion"

export function ProtectedRoute() {
  const { user, isEnabled, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <FadeSwap stateKey="protected-loading">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </FadeSwap>
    )
  }

  if (!user || !isEnabled) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  }

  return (
    <FadeSwap stateKey="protected-content">
      <Outlet />
    </FadeSwap>
  )
}
