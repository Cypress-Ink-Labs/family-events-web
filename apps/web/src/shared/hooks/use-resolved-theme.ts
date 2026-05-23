import { useEffect, useState } from "react"

type Resolved = "light" | "dark"

function readResolvedTheme(): Resolved {
  if (typeof document === "undefined") {
    return "light"
  }
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

/**
 * Reads the effective light/dark theme by observing the `dark` class on
 * <html>. ThemeProvider toggles that class for "system" + explicit values,
 * so this hook works regardless of how the theme is set.
 */
export function useResolvedTheme(): Resolved {
  const [resolved, setResolved] = useState<Resolved>(readResolvedTheme)

  useEffect(() => {
    const update = () => setResolved(readResolvedTheme())
    update()

    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  return resolved
}
