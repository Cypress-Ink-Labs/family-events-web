import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: "sm" | "md" | "lg"
  showCount?: boolean
  count?: number
  className?: string
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
  showCount = false,
  count,
  className,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0)

  const sizes = { sm: "h-3 w-3", md: "h-4 w-4", lg: "h-5 w-5" }
  const display = hovered || value

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={cn(
            "transition-transform",
            !readonly && "hover:scale-110 cursor-pointer",
            readonly && "cursor-default"
          )}
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
        >
          <Star
            className={cn(
              sizes[size],
              "transition-colors",
              star <= display
                ? "fill-amber-400 stroke-amber-400"
                : "fill-transparent stroke-muted-foreground/40"
            )}
          />
        </button>
      ))}
      {showCount && count !== undefined && (
        <span className="ml-1 text-sm text-muted-foreground">({count})</span>
      )}
    </div>
  )
}
