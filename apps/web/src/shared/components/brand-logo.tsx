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
const lockupSrc = "/brand/family-events-lockup.png"

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
      <img
        src={showText ? lockupSrc : iconSrc}
        alt=""
        className={cn(
          showText ? "h-10 w-auto object-contain" : "size-9 rounded-md object-cover",
          showText && textClassName,
          markClassName
        )}
        width={showText ? 121 : 36}
        height={showText ? 40 : 36}
      />
    </Link>
  )
}
