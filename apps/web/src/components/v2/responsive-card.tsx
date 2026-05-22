import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type ResponsiveCardProps = {
  /** Leading media or icon block. Stays compact on mobile. */
  leading?: ReactNode
  /** Title row content. */
  title?: ReactNode
  /** Body / metadata row. */
  body?: ReactNode
  /** Trailing toggles / overflow / status. Wraps below body on narrow containers. */
  trailing?: ReactNode
  /** Action row at the bottom (chips, buttons). Always full-width below content. */
  actions?: ReactNode
  className?: string
}

/**
 * Container-query-aware card that collapses horizontal to vertical at narrow widths.
 * Actions stay full-width below the content in both layouts.
 */
export function ResponsiveCard({
  leading,
  title,
  body,
  trailing,
  actions,
  className,
}: ResponsiveCardProps) {
  return (
    <Card className={cn("@container/card overflow-hidden", className)}>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-col gap-3 @[380px]/card:flex-row @[380px]/card:items-start">
          {leading ? <div className="shrink-0">{leading}</div> : null}
          <div className="min-w-0 flex-1 space-y-1">
            {title ? (
              <div className="font-display text-base font-medium leading-tight">{title}</div>
            ) : null}
            {body ? <div className="text-sm text-muted-foreground">{body}</div> : null}
          </div>
          {trailing ? (
            <div className="flex flex-wrap items-center gap-2 @[380px]/card:shrink-0">
              {trailing}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">{actions}</div>
        ) : null}
      </CardContent>
    </Card>
  )
}
