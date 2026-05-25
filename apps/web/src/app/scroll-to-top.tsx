import { useEffect } from "react"
import { useLocation } from "react-router-dom"

/** Resets window scroll on route changes. BrowserRouter has no ScrollRestoration. */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
