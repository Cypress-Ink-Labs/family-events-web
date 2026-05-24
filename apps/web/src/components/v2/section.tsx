import type { ReactNode } from "react"
import { cn } from "@/shared/utils/format"

type SectionProps = {
  title?: ReactNode
  lede?: ReactNode
  action?: ReactNode
  className?: string
  children: ReactNode
}

/**
 * Vertical-rhythm section with optional title + lede + right-aligned action.
 * On mobile the action wraps below title (Toolbar handles tighter compositions).
 */
export function Section({ title, lede, action, className, children }: SectionProps) {
  const hasHeader = title || lede || action
  return (
    <section className={cn("space-y-4 py-6 md:py-8", className)}>
      {hasHeader ? (
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            {title ? (
              <h2 className="font-display text-2xl font-medium leading-tight tracking-tight md:text-3xl">
                {title}
              </h2>
            ) : null}
            {lede ? (
              <p className="font-editorial italic text-base text-muted-foreground md:text-lg">
                {lede}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      <div className="space-y-4">{children}</div>
    </section>
  )
}
