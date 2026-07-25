import type { PlannedEvent } from "@/features/plan/hooks/use-plan-for-today"

type PlanReasonScores = Pick<
  PlannedEvent,
  "distance_score" | "weather_score" | "age_score" | "history_affinity"
>

type PlanReasonScore = {
  [Key in keyof PlanReasonScores]: PlanReasonScores[Key] | null | undefined
}

type PlanReasonCandidate = {
  label: string
  score: number
}

type OptionalPlanReasonCandidate = {
  label: string
  score: number | null | undefined
}

const SECOND_REASON_THRESHOLD = 0.6

export function planReasonChips(event: PlanReasonScore): string[] {
  const candidates: OptionalPlanReasonCandidate[] = [
    { score: event.distance_score, label: "Close by" },
    { score: event.weather_score, label: "Good for today's weather" },
    { score: event.age_score, label: "Great age fit" },
    { score: event.history_affinity, label: "Matches your saved events" },
  ]
  const ranked = candidates
    .filter((candidate): candidate is PlanReasonCandidate => candidate.score != null)
    .sort((left, right) => right.score - left.score)

  const first = ranked[0]
  if (!first) {
    return []
  }

  const labels = [first.label]
  if (ranked[1]?.score >= SECOND_REASON_THRESHOLD) {
    labels.push(ranked[1].label)
  }

  return labels
}
