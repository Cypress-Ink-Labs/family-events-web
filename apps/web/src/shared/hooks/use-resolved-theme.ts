import { useSyncExternalStore } from "react"

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
  return useSyncExternalStore(subscribeToThemeClass, readResolvedTheme, () => "light")
}

function subscribeToThemeClass(onStoreChange: () => void) {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
    return () => {}
  }

  const observer = new MutationObserver(onStoreChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })

  return () => observer.disconnect()
}
