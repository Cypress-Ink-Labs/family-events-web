import { getHourFormatter } from "@/shared/lib/intl-formatters"

export type ParentTipCategory =
  | "arrival"
  | "bring"
  | "behavior"
  | "timing"
  | "weather"
  | "accessibility"

export interface ParentTip {
  category: string
  text: string
}

export interface ParentTipsEventInput {
  age_min: number | null
  age_max: number | null
  is_outdoor: boolean | null
  start_datetime: string
  /**
   * IANA timezone for the event (e.g. "America/Chicago"). Required so the
   * evening / nap-window rule compares the event's local hour, not the
   * viewer's browser-local hour.
   */
  timezone: string
  tag_slugs: string[]
}

function hourInTimezone(iso: string, timezone: string): number | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  try {
    const value = Number.parseInt(getHourFormatter(timezone).format(date), 10)
    return Number.isFinite(value) ? value : null
  } catch {
    // Invalid IANA zone — fall back to UTC so the rule still has a defined
    // baseline instead of silently using the viewer's local time.
    return date.getUTCHours()
  }
}

const MESSY_PLAY_SLUGS = new Set(["messy-play", "art", "painting", "craft", "crafts"])
const TICKETED_SLUGS = new Set(["ticketed", "registration", "rsvp"])

interface Rule {
  category: ParentTipCategory
  applies: (e: ParentTipsEventInput) => boolean
  text: (e: ParentTipsEventInput) => string
}

const RULES: Rule[] = [
  {
    category: "weather",
    applies: (e) => e.is_outdoor === true,
    text: () =>
      "Outdoor event — check the forecast before you head out and dress for sun, rain, or wind.",
  },
  {
    category: "bring",
    applies: (e) => e.age_min !== null && e.age_min < 3,
    text: () =>
      "Pack snacks and a comfort item — under-three kids get hungry and overstimulated fast.",
  },
  {
    category: "bring",
    applies: (e) => e.tag_slugs.some((slug) => MESSY_PLAY_SLUGS.has(slug)),
    text: () => "Bring a change of clothes — this one tends to get messy.",
  },
  {
    category: "arrival",
    applies: (e) => e.tag_slugs.some((slug) => TICKETED_SLUGS.has(slug)),
    text: () => "Bring your ticket or registration confirmation — staff will check it at the door.",
  },
  {
    category: "timing",
    applies: (e) => {
      const hour = hourInTimezone(e.start_datetime, e.timezone)
      return hour !== null && hour >= 17
    },
    text: () => "Late afternoon start — past the typical nap window, so plan for tired kids.",
  },
  {
    category: "arrival",
    applies: (e) => e.is_outdoor === false,
    text: () => "Arrive about ten minutes early to settle in before the indoor session starts.",
  },
]

const DEFAULT_TIP: ParentTip = {
  category: "arrival",
  text: "Arrive a few minutes early so the kids have time to get comfortable with the space.",
}

export function deriveFallbackTips(event: ParentTipsEventInput): ParentTip[] {
  const seen = new Set<string>()
  const tips: ParentTip[] = []

  for (const rule of RULES) {
    if (tips.length === 3) break
    if (seen.has(rule.category)) continue
    if (!rule.applies(event)) continue

    tips.push({ category: rule.category, text: rule.text(event) })
    seen.add(rule.category)
  }

  if (tips.length === 0) {
    tips.push(DEFAULT_TIP)
  }

  return tips
}
