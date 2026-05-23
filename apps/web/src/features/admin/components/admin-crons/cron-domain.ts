import type { CronRun } from "@/features/admin/types"

const CADENCE_SUFFIXES = new Set([
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "nightly",
  "quarter-hourly",
])

const DOMAIN_LABEL_OVERRIDES: Record<string, string> = {
  ai: "AI",
  ical: "iCal",
  rss: "RSS",
  url: "URL",
}

/**
 * Extracts a domain key + display label from a cron job name by dropping
 * cadence suffixes (hourly/daily/etc.) and applying acronym capitalization.
 */
export function getCronRunDomain(jobName: string): { key: string; label: string } {
  const parts = jobName.split("-").filter(Boolean)

  while (parts.length > 1 && CADENCE_SUFFIXES.has(parts[parts.length - 1])) {
    parts.pop()
  }

  const key = parts.join("-") || jobName
  const label =
    parts
      .map((part) => DOMAIN_LABEL_OVERRIDES[part] ?? part[0].toUpperCase() + part.slice(1))
      .join(" ") || jobName

  return { key, label }
}

export interface CronDomainGroup {
  key: string
  label: string
  runs: CronRun[]
}

export function groupCronRunsByDomain(runs: CronRun[]): CronDomainGroup[] {
  const groups = new Map<string, CronDomainGroup>()
  for (const run of runs) {
    const domain = getCronRunDomain(run.jobname)
    const group = groups.get(domain.key)
    if (group) {
      group.runs.push(run)
      continue
    }
    groups.set(domain.key, { ...domain, runs: [run] })
  }
  return [...groups.values()]
}

export const ALL_RUNS_DOMAIN = "all"
