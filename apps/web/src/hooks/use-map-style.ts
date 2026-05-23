import { useEffect, useState } from "react"
import type { StyleSpecification } from "maplibre-gl"
import { useResolvedTheme } from "@/hooks/use-resolved-theme"
import { LIBERTY_STYLE_URL, getDarkLibertyStyle } from "@/shared/map-styles"

/**
 * Returns the right MapLibre style for the current theme.
 * - Light: Liberty style URL (loaded by MapLibre directly).
 * - Dark: a recolored Liberty StyleSpecification object built on first use
 *   and cached at module scope. Falls back to the light URL while loading.
 */
export function useMapStyle(): string | StyleSpecification {
  const resolved = useResolvedTheme()
  const [darkStyle, setDarkStyle] = useState<StyleSpecification | null>(null)

  useEffect(() => {
    if (resolved !== "dark") return
    let cancelled = false
    getDarkLibertyStyle()
      .then((style) => {
        if (!cancelled) setDarkStyle(style)
      })
      .catch((err) => {
        console.error("Failed to build dark map style", err)
      })
    return () => {
      cancelled = true
    }
  }, [resolved])

  if (resolved === "dark" && darkStyle) {
    return darkStyle
  }
  return LIBERTY_STYLE_URL
}
