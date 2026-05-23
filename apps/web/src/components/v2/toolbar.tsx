import type { ReactNode } from "react"
import { cn } from "@/shared/utils/format"

type ToolbarProps = {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  className?: string
}

/**
 * Page / section header with responsive title, subtitle, actions, and filters.
 * On <md actions wrap below the title; on md+ they pin to the right edge.
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
