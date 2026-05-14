import { z } from "zod"

// plan_events_for_user returns the scored event ranking. Numeric columns
// arrive as Postgres numeric → string in the wire format unless we let
// PostgREST coerce; coerce here for safety.
export const planEventsRowSchema = z.object({
  event_id: z.string(),
  score: z.coerce.number(),
  distance_score: z.coerce.number(),
  weather_score: z.coerce.number(),
  age_score: z.coerce.number(),
  history_affinity: z.coerce.number(),
  distance_km: z.coerce.number().nullable(),
})

export type PlanEventsRow = z.infer<typeof planEventsRowSchema>

// plan_events_first_nonempty_window mirrors plan_events_for_user plus a
// day_offset column on every row so the caller can derive selectedDate
// without a second query.
export const planEventsWindowRowSchema = planEventsRowSchema.extend({
  day_offset: z.coerce.number().int().min(0),
})

export type PlanEventsWindowRow = z.infer<typeof planEventsWindowRowSchema>
