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
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    label: "Music & Movement",
    slug: "music",
    icon: Music,
    color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  },
  {
    label: "Outdoor Fun",
    slug: "outdoor",
    icon: TreePine,
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  {
    label: "Indoor Storytime",
    slug: "storytime",
    icon: BookOpen,
    color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
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
