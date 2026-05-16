import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type ToolbarProps = {
  title?: ReactNode
  subtitle?: ReactNode
  /** Primary action(s) — pinned to the right on md+, stacks below title on mobile. */
  actions?: ReactNode
  /** Persistent inline content (filters, search). Wraps under title on mobile. */
  children?: ReactNode
  className?: string
}

/**
 * Page / section header that survives mobile.
 *
 * Replaces ad-hoc `flex items-center justify-between` patterns across
 * admin screens. On <md, the title + subtitle stack on top and the
 * actions wrap to a new row; on md+, actions pin to the right edge.
 *
 * Use this anywhere you currently have `justify-between` with header
 * text on the left and buttons on the right (admin-sources offender pattern).
 */
export function Toolbar({ title, subtitle, actions, children, className }: ToolbarProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          {title ? (
            <h2 className="font-display text-xl font-medium leading-tight tracking-tight md:text-2xl">
              {title}
            </h2>
          ) : null}
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  )
}
