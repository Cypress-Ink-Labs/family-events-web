import type { ElementType, ReactNode } from "react"
import { cn } from "@/lib/utils"

type TouchTargetProps<E extends ElementType> = {
  as?: E
  asChild?: boolean
  className?: string
  children: ReactNode
} & Omit<React.ComponentPropsWithRef<E>, "as" | "className" | "children">

/**
 * Enforces ≥44×44 minimum hit area on any interactive element (per WCAG / iOS HIG).
 * The visual size of `children` can stay smaller — padding fills the rest.
 * Wraps any element (button, a, label, ...). Default: button.
 */
export function TouchTarget({ as, className, children, ...rest }: TouchTargetProps<ElementType>) {
  const Tag = (as ?? "button") as ElementType
  return (
    <Tag
      className={cn("inline-flex min-h-[44px] min-w-[44px] items-center justify-center", className)}
      {...rest}
    >
      {children}
    </Tag>
  )
}
