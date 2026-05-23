import type { ElementType, ReactNode } from "react"
import { Card, CardContent } from "@/shared/components/ui/card"
import { cn } from "@/shared/utils/format"

/**
 * Compact "nothing here yet" card. Used wherever a feature would otherwise
 * inline its own muted-foreground div + icon.
 */

interface EmptyStateProps {
  icon?: ElementType
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={cn("border-border/60 bg-card/50", className)}>
      <CardContent className="flex flex-col items-center justify-center gap-2 p-6 text-center">
        {Icon ? <Icon className="size-6 text-muted-foreground" /> : null}
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-xs text-muted-foreground max-w-sm">{description}</p>
        ) : null}
        {action}
      </CardContent>
    </Card>
  )
}
