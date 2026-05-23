import type { ReactNode } from "react"
import { cn } from "@/shared/utils/format"

type FilterBarProps = {
  children: ReactNode
  trailing?: ReactNode
  className?: string
}

/**
 * Horizontal scroll-snap filter chip row on mobile, wraps on md+.
 * Chip children should be inline-flex elements; the bar owns the snap container.
 */
export function FilterBar({ children, trailing, className }: FilterBarProps) {
  return (
    <div className={cn("flex w-full min-w-0 items-center gap-2", className)}>
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
