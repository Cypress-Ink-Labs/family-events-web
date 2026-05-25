import { BookOpen, Music, TreePine, Users } from "lucide-react"
import type { ElementType } from "react"

/**
 * Top-level category chips on the explore page. Each entry maps a tag slug to
 * a presentation token (label, icon, Tailwind color pair). Keep this list
 * tag-slug-aligned with `packages/contracts` tag definitions.
 */

export interface ExploreCategory {
  label: string
  slug: string
  icon: ElementType
  /** Tailwind class string covering both light and dark backgrounds + foreground. */
  color: string
}

export const EXPLORE_CATEGORIES: readonly ExploreCategory[] = [
  {
    label: "Playgroups",
    slug: "playgroup",
    icon: Users,
    color: "bg-[var(--color-accent-tertiary-soft)] text-[var(--color-accent-tertiary)]",
  },
  {
    label: "Music & Movement",
    slug: "music",
    icon: Music,
    color: "bg-[var(--color-accent-secondary-soft)] text-[var(--color-accent-secondary)]",
  },
  {
    label: "Outdoor Fun",
    slug: "outdoor",
    icon: TreePine,
    color: "bg-[var(--color-accent-primary-soft)] text-[var(--color-accent-primary)]",
  },
  {
    label: "Indoor Storytime",
    slug: "storytime",
    icon: BookOpen,
    color: "bg-[var(--color-accent-tertiary-soft)] text-[var(--color-accent-tertiary)]",
  },
]

export const EXPLORE_DATE_QUICK_FILTERS = [
  { label: "Today", value: "today" },
  { label: "This Weekend", value: "weekend" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Past Events", value: "past" },
] as const

export type ExploreDateQuickFilter = (typeof EXPLORE_DATE_QUICK_FILTERS)[number]["value"]

export const EXPLORE_AGE_OPTIONS = [
  { label: "0-1 yr", min: 0, max: 1 },
  { label: "1-3 yrs", min: 1, max: 3 },
  { label: "2-4 yrs", min: 2, max: 4 },
  { label: "5-8 yrs", min: 5, max: 8 },
  { label: "9+ yrs", min: 9, max: null },
] as const

export type ExploreAgeOption = (typeof EXPLORE_AGE_OPTIONS)[number]
