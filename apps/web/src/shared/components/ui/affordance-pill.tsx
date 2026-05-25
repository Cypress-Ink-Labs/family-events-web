import type { LucideIcon } from "lucide-react"
import { Baby, DoorOpen, Home, MapPin, ShoppingCart, Smile } from "lucide-react"

import { cn } from "@/shared/utils/format"

type AffordanceVariant =
  | "age"
  | "free"
  | "stroller"
  | "indoor-backup"
  | "walkable"
  | "bathroom-on-site"

interface AffordancePillProps {
  variant: AffordanceVariant
  label?: string
  className?: string
}

interface VariantConfig {
  icon: LucideIcon
  defaultLabel: string
  soft: boolean
}

const VARIANT_CONFIG: Record<AffordanceVariant, VariantConfig> = {
  age: { icon: Baby, defaultLabel: "All ages", soft: false },
  free: { icon: Smile, defaultLabel: "Free", soft: false },
  stroller: { icon: ShoppingCart, defaultLabel: "Stroller OK", soft: true },
  "indoor-backup": { icon: Home, defaultLabel: "Indoor backup", soft: true },
  walkable: { icon: MapPin, defaultLabel: "Walkable", soft: true },
  "bathroom-on-site": { icon: DoorOpen, defaultLabel: "Restrooms", soft: true },
}

// age + free use solid kid color; others use kid-soft with muted text
const solidClass = "bg-[var(--color-accent-kid)] text-[var(--color-text-primary)]"
const softClass = "bg-[var(--color-accent-kid-soft)] text-[var(--color-text-primary)]"

// Compact variant — no touch-target padding, for dense card contexts
export function AffordancePillCompact({ variant, label, className }: AffordancePillProps) {
  const config = VARIANT_CONFIG[variant]
  const Icon = config.icon
  const displayLabel = label ?? config.defaultLabel

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        config.soft ? softClass : solidClass,
        className
      )}
    >
      <Icon className="size-2.5 shrink-0" aria-hidden />
      {displayLabel}
    </span>
  )
}

export type { AffordanceVariant }
