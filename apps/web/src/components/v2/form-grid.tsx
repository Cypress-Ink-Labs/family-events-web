import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type FormGridProps = {
  cols?: 1 | 2 | 3
  gap?: "3" | "4" | "5"
  className?: string
  children: ReactNode
}

const gapClass = {
  "3": "gap-3",
  "4": "gap-4",
  "5": "gap-6",
} as const

const colsClass = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
} as const

/**
 * Form layout grid that defaults single-column on mobile and steps up on md+.
 *
 * Replaces `grid grid-cols-2` patterns in admin dialogs that overflow phone width.
 * Field-level overrides via `className` on individual children, e.g. `col-span-2`
 * for full-width fields like description.
 */
export function FormGrid({ cols = 2, gap = "4", className, children }: FormGridProps) {
  return (
    <div className={cn("grid grid-cols-1", colsClass[cols], gapClass[gap], className)}>
      {children}
    </div>
  )
}
