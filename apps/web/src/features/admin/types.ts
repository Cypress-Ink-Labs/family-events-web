import type {
  City,
  Comment,
  EventAiTrace,
  EventAiTraceWithParsed,
  Rating,
  SourceRun,
  UserAccess,
  UserProfile,
} from "@/shared/types"

export interface AdminComment extends Comment {
  user_profiles: { display_name: string | null } | null
  events: { title: string | null } | null
}

export interface AdminRating extends Rating {
  user_profiles: { display_name: string | null } | null
  events: { title: string | null } | null
}

export interface AdminSourceRun extends SourceRun {
  event_sources: { name: string | null } | null
}

export interface AdminUserAccessRecord extends UserAccess {
  user_profiles: Pick<UserProfile, "display_name" | "email" | "role" | "created_at"> | null
}

export interface AdminStats {
  totalEvents: number
  pendingReview: number
  published: number
  activeSources: number
  sourceErrors: number
  aiBuckets: {
    high: number
    medium: number
    low: number
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function normalizeAiTrace(trace: EventAiTrace | null): EventAiTraceWithParsed | null {
  if (!trace) {
    return null
  }

  const parsed_predicted_tags = Array.isArray(trace.predicted_tags)
    ? trace.predicted_tags.flatMap((value) => {
        if (!isRecord(value) || typeof value.slug !== "string") {
          return []
        }

        return [
          {
            slug: value.slug,
            confidence: typeof value.confidence === "number" ? value.confidence : 0,
            reason: typeof value.reason === "string" ? value.reason : null,
            matched_keywords: Array.isArray(value.matched_keywords)
              ? value.matched_keywords.filter(
                  (keyword): keyword is string => typeof keyword === "string"
                )
              : undefined,
          },
        ]
      })
    : []

  const parsed_predicted_fields = isRecord(trace.predicted_fields)
    ? {
        age_min:
          typeof trace.predicted_fields.age_min === "number"
            ? trace.predicted_fields.age_min
            : null,
        age_max:
          typeof trace.predicted_fields.age_max === "number"
            ? trace.predicted_fields.age_max
            : null,
        price:
          typeof trace.predicted_fields.price === "number" ? trace.predicted_fields.price : null,
        is_free:
          typeof trace.predicted_fields.is_free === "boolean"
            ? trace.predicted_fields.is_free
            : null,
        venue_name:
          typeof trace.predicted_fields.venue_name === "string"
            ? trace.predicted_fields.venue_name
            : null,
      }
    : null

  return {
    ...trace,
    parsed_predicted_tags,
    parsed_predicted_fields,
  }
}

export interface CronJob {
  jobid: number
  jobname: string
  schedule: string
  command: string
  active: boolean
  last_run_start: string | null
  last_run_end: string | null
  last_run_status: string | null // 'succeeded' | 'failed' | 'starting' (pg_cron values)
  last_run_message: string | null
}

export type CronRunProvider = "pg_cron" | "railway"

export interface CronRun {
  runid: number
  jobname: string
  status: string
  return_message: string | null
  start_time: string
  end_time: string | null
  duration_ms: number | null
  provider: CronRunProvider
}

export interface RailwayCronJob {
  label: string
  enabled: boolean
  last_run_status: string | null
  last_run_at: string | null
  last_run_duration_s: number | null
  last_http_status: number | null
}

export interface RailwayCronRun {
  id: number
  label: string
  status: string
  http_status: number | null
  duration_s: number | null
  body: string | null
  ran_at: string
}

export interface CronRunLogEntry {
  id: number
  provider: "railway" | "supabase"
  level: "debug" | "info" | "log" | "warn" | "error"
  message: string
  metadata: Record<string, unknown>
  sequence: number | null
  created_at: string
}

export interface RailwayCronRunDetail extends RailwayCronRun {
  run_key: string
  logs: CronRunLogEntry[]
}

export function railwayCronRunToCronRun(r: RailwayCronRun): CronRun {
  return {
    runid: r.id,
    jobname: r.label,
    status: r.status,
    return_message: r.body ?? null,
    start_time: r.ran_at,
    end_time: null,
    duration_ms: r.duration_s != null ? r.duration_s * 1000 : null,
    provider: "railway",
  }
}

export type { City }

export interface ApprovedAiModel {
  id: string
  provider: string
  display_name: string
  description: string
  cost_tier: "low" | "medium" | "high"
}

export interface AiFeatureConfig {
  feature: "tagging" | "event-review"
  model_id: string
  enabled: boolean
  updated_at: string
  updated_by: string | null
}
