import { Link } from "react-router"
import { cn } from "@/shared/utils/format"

type BrandLogoProps = {
  to?: string
  showText?: boolean
  textClassName?: string
  className?: string
  markClassName?: string
}

const iconSrc = "/brand/family-events-icon.png"

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-9 shrink-0", className)} aria-hidden="true">
      <img
        src={iconSrc}
        alt=""
        className="size-full rounded-lg object-cover shadow-sm dark:hidden"
        width={36}
        height={36}
      />
      <span className="hidden size-full items-center justify-center rounded-lg border border-primary/30 bg-primary/15 font-display text-sm font-semibold text-primary shadow-sm dark:flex">
        F
      </span>
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
