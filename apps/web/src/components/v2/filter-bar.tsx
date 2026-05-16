import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type FilterBarProps = {
  /** Render chips inline. On mobile they scroll-snap horizontally; on md+ they wrap. */
  children: ReactNode
  /** Optional trailing action (e.g., "Clear filters"). Pinned to the right on md+. */
  trailing?: ReactNode
  className?: string
}

/**
 * Horizontal scroll-snap filter chip row on mobile, wraps on md+.
 *
 * Replaces ad-hoc filter rows (admin-city-filter-bar, explore filters)
 * that overflow the viewport or wrap mid-chip on narrow screens.
 *
 * Chip children should be the v2 `<Chip>` primitive or any inline-flex
 * element with `scroll-snap-align: start` styling — the bar applies a
 * snap container at <md.
 */
export function FilterBar({ children, trailing, className }: FilterBarProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2",
          "overflow-x-auto md:flex-wrap md:overflow-visible",
          "snap-x snap-mandatory md:snap-none",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        {children}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  )
}
