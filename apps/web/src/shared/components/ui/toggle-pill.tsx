import { cn } from "@/shared/utils/format"

type TogglePillVariant = "outline" | "soft"

interface TogglePillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  /** "outline" (default): bordered chip. "soft": filled muted background. */
  variant?: TogglePillVariant
  children: React.ReactNode
}

const variantStyles: Record<TogglePillVariant, { active: string; inactive: string }> = {
  outline: {
    active: "border-primary bg-primary text-primary-foreground",
    inactive: "border-border hover:bg-accent",
  },
  soft: {
    active: "bg-primary text-primary-foreground",
    inactive: "bg-muted text-muted-foreground hover:text-foreground",
  },
}

/**
 * A small toggle pill button used for filter chips, status selectors,
 * and other toggle-like controls throughout the app.
 *
 * Replaces raw `<button>` elements with a consistent, accessible component.
 */
export function TogglePill({
  active,
  variant = "outline",
  className,
  children,
  ...props
}: TogglePillProps) {
  const styles = variantStyles[variant]
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-[36px] shrink-0 snap-start items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        variant === "soft" && "border-transparent",
        active ? styles.active : styles.inactive,
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
