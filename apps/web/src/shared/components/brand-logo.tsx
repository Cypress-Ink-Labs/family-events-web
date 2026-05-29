import { Link } from "react-router"
import { cn } from "@/shared/utils/format"

type BrandLogoProps = {
  to?: string
  showText?: boolean
  textClassName?: string
  className?: string
  markClassName?: string
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/15 font-display text-sm font-semibold text-primary shadow-sm",
        className
      )}
      aria-hidden="true"
    >
      F
    </span>
  )
}

export function BrandLogo({
  to = "/",
  showText = true,
  textClassName,
  className,
  markClassName,
}: BrandLogoProps) {
  return (
    <Link
      to={to}
      className={cn("inline-flex min-h-[44px] min-w-[44px] items-center gap-2", className)}
      aria-label="Family Events home"
    >
      <BrandMark className={markClassName} />
      {showText ? (
        <span
          className={cn(
            "font-display text-lg font-semibold leading-none tracking-normal text-foreground",
            textClassName
          )}
        >
          Family <span className="text-primary">Events</span>
        </span>
      ) : null}
    </Link>
  )
}
