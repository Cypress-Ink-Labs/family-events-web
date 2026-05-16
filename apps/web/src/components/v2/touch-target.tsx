import { forwardRef, type ElementType, type ReactNode } from "react"
import { cn } from "@/lib/utils"

type TouchTargetProps<E extends ElementType> = {
  as?: E
  asChild?: boolean
  className?: string
  children: ReactNode
} & Omit<React.ComponentPropsWithoutRef<E>, "as" | "className" | "children">

/**
 * Enforces ≥44×44 minimum hit area on any interactive element (per WCAG / iOS HIG).
 * The visual size of `children` can stay smaller — padding fills the rest.
 * Wraps any element (button, a, label, ...). Default: button.
 */
export const TouchTarget = forwardRef<HTMLElement, TouchTargetProps<ElementType>>(
  function TouchTarget({ as, className, children, ...rest }, ref) {
    const Tag = (as ?? "button") as ElementType
    return (
      <Tag
        ref={ref}
        className={cn(
          "inline-flex min-h-[44px] min-w-[44px] items-center justify-center",
          className,
        )}
        {...rest}
      >
        {children}
      </Tag>
    )
  },
)
