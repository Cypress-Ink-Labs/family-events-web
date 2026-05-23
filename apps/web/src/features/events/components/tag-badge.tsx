import { cn } from "@/shared/utils/format"
import type { Tag } from "@/shared/types"

interface TagBadgeProps {
  tag: Tag
  size?: "sm" | "md"
  className?: string
}

export function TagBadge({ tag, size = "sm", className }: TagBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold uppercase tracking-wide",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        className
      )}
      style={{
        backgroundColor: tag.color + "22",
        color: tag.color,
        border: `1px solid ${tag.color}44`,
      }}
    >
      {tag.name}
    </span>
  )
}

interface AgeRangeBadgeProps {
  ageMin: number | null
  ageMax: number | null
  className?: string
}

export function AgeRangeBadge({ ageMin, ageMax, className }: AgeRangeBadgeProps) {
  if (ageMin === null && ageMax === null) return null

  let label = ""
  if (ageMin === null) label = `Under ${ageMax}y`
  else if (ageMax === null) label = `${ageMin}y+`
  else label = `${ageMin}-${ageMax} years`

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        "bg-primary/10 text-primary border border-primary/20",
        className
      )}
    >
      {label}
    </span>
  )
}
