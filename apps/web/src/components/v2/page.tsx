import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type PageWidth = "content" | "wide" | "full"

const widthClass: Record<PageWidth, string> = {
  content: "max-w-[1280px]",
  wide: "max-w-[1440px]",
  full: "max-w-none",
}

type PageProps = {
  width?: PageWidth
  padded?: boolean
  className?: string
  children: ReactNode
}

/**
 * Standard page container. Replaces ad-hoc `max-w-5xl mx-auto px-4`.
 * - Mobile-first padding: px-4 mobile, px-6 md+, px-8 lg+.
 * - `width="content"` (1280, default) for consumer pages.
 * - `width="wide"` (1440) for admin pages with dense tables.
 * - `width="full"` for map and other edge-to-edge surfaces.
 */
export function Page({ width = "content", padded = true, className, children }: PageProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        widthClass[width],
        padded && "px-4 md:px-6 lg:px-8",
        className
      )}
    >
      {children}
    </div>
  )
}
