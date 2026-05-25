import { useEffect } from "react"
import { useLocation } from "react-router"

/** Resets window scroll on route changes for this SPA route tree. */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
