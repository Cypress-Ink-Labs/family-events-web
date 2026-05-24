import { useQuery } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import { enrichedEventRowSchema } from "@/lib/schemas"
import { Sentry } from "@/infrastructure/observability/sentry"
import { fetchEventsPage } from "@/lib/db/rpc-events"
import type { Event, EventTag, EventWithDetails, Tag } from "@/shared/types"

interface UseEnrichedEventsOptions {
  cityId?: string
  userId?: string
  status?: Event["status"]
  limit?: number
  enabled?: boolean
  includePast?: boolean
  /**
   * When set, the RPC returns exactly those events, bypassing the
   * city/status/limit filters. Used by my-events and event-detail
   * so saved-ids and single-id fetches share the enriched path.
   */
  eventIds?: string[]
  /** Inclusive lower bound on start_datetime (passed as ISO string to the RPC). */
  dateFrom?: string | Date
  /** Inclusive upper bound on start_datetime (passed as ISO string to the RPC). */
  dateTo?: string | Date
}

const DEFAULT_LIMIT = 100
const DEFAULT_STATUS: Event["status"] = "published"

function toIsoDate(value: string | Date): string {
  return typeof value === "string" ? value : value.toISOString()
}

function startOfTodayIso(now = new Date()): string {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  return start.toISOString()
}

function effectiveDateFrom(options: UseEnrichedEventsOptions): string | Date | undefined {
  if (options.eventIds || options.includePast || options.dateFrom || options.dateTo) {
    return options.dateFrom
  }

  return startOfTodayIso()
}

// Adapt the RPC's flat tag array into EventWithDetails' nested EventTag + Tag
// shape so EventCard / TagBadge / admin list rendering stays drop-in. Inputs
// are already validated by enrichedEventRowSchema, so we don't re-check shape.
function adaptTags(
  eventId: string,
  tags: { id: string; name: string; slug: string; color: string }[]
): (EventTag & { tag: Tag })[] {
  return tags.map((t) => ({
    event_id: eventId,
    tag_id: t.id,
    confidence: 1,
    is_manual_override: false,
    created_at: "",
    tag: {
      id: t.id,
      name: t.name,
      slug: t.slug,
      color: t.color,
      category: "",
      is_system: false,
      created_at: "",
    },
  }))
}

export function adaptEnrichedRow(row: unknown): EventWithDetails {
  // zod boundary: parse first so bad RPC payloads surface as a typed error
  // here instead of crashing deep in a render. safeParse + Sentry capture
  // keeps the worst case (one bad row in a list) graceful — we throw which
  // bubbles to TanStack Query's error path.
  const parsed = enrichedEventRowSchema.safeParse(row)
  if (!parsed.success) {
    Sentry.captureException(parsed.error, {
      tags: { area: "events_enriched.adapt" },
      extra: { row_id: (row as { id?: unknown })?.id ?? null },
    })
    throw parsed.error
  }
  const data = parsed.data

  // After parsing, only EventWithDetails-specific shaping remains. The cast
  // is now a structural narrowing (the parsed object is structurally compatible
  // with Event) rather than a "trust me" assertion.
  const event = data as unknown as Event

  return {
    ...event,
    images: data.images,
    tags: adaptTags(data.id, data.tags ?? []),
    avg_rating: data.avg_rating,
    rating_count: data.rating_count,
    is_favorited: data.is_favorited,
    is_in_calendar: data.is_in_calendar,
  }
}

// Exported for unit tests. Mirrors the RPC signature exactly — when
// p_event_ids is set the server ignores city/status/limit, so we
// elide those keys client-side to keep the payload honest.
export function buildEnrichedRpcArgs(options: UseEnrichedEventsOptions) {
  const {
    cityId,
    userId,
    status = DEFAULT_STATUS,
    limit = DEFAULT_LIMIT,
    eventIds,
    dateTo,
  } = options
  const resolvedDateFrom = effectiveDateFrom(options)

  return {
    p_city_id: eventIds ? undefined : (cityId ?? undefined),
    p_status: eventIds ? undefined : status,
    p_limit: eventIds ? undefined : limit,
    p_user_id: userId ?? undefined,
    p_event_ids: eventIds,
    p_date_from: resolvedDateFrom ? toIsoDate(resolvedDateFrom) : undefined,
    p_date_to: dateTo ? toIsoDate(dateTo) : undefined,
  }
}

// Exported for unit tests. Two key shapes:
//  - by-ids:   ["events-enriched", "by-ids", sortedIds, userId]
//  - list:     ["events-enriched", { cityId, status, userId, dateFrom, dateTo }]
// IDs are sorted so caller insertion-order does not fragment the cache.
export function buildEnrichedQueryKey(options: UseEnrichedEventsOptions) {
  return qk.enrichedEvents.key({
    ...options,
    limit: options.eventIds ? undefined : (options.limit ?? DEFAULT_LIMIT),
    dateFrom: effectiveDateFrom(options),
  })
}

async function fetchEnrichedEvents(options: UseEnrichedEventsOptions): Promise<EventWithDetails[]> {
  // Short-circuit empty id arrays — RPC would return 0 rows anyway, skip the round-trip.
  if (options.eventIds && options.eventIds.length === 0) {
    return []
  }

  const rpcArgs = buildEnrichedRpcArgs(options)
  const data = await fetchEventsPage({
    cityId: rpcArgs.p_city_id,
    status: rpcArgs.p_status,
    userId: rpcArgs.p_user_id,
    eventIds: rpcArgs.p_event_ids,
    dateFrom: rpcArgs.p_date_from,
    dateTo: rpcArgs.p_date_to,
    limit: rpcArgs.p_limit ?? 24,
  })

  return (data as unknown[]).map((row) => adaptEnrichedRow(row))
}

export function useEnrichedEvents(options: UseEnrichedEventsOptions = {}) {
  const { enabled = true } = options

  return useQuery({
    queryKey: buildEnrichedQueryKey(options),
    queryFn: () => fetchEnrichedEvents(options),
    enabled,
  })
}

const ENRICHED_EVENTS_QUERY_KEY =qk.enrichedEvents.all[0]
