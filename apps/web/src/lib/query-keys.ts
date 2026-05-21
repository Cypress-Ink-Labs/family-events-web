import type { Event, EventFilters } from "@/lib/types"
import { sanitizePostgrestLike } from "@/lib/utils"

const DEFAULT_EVENT_STATUS: Event["status"] = "published"

type EnrichedEventsKeyOptions = {
  cityId?: string
  userId?: string
  status?: Event["status"]
  eventIds?: string[]
  dateFrom?: string | Date
  dateTo?: string | Date
}

type EventsKeyOptions = {
  filters?: EventFilters
  userId?: string
  limit: number
  offset: number
}

type SaturdayPlanKeyOptions = {
  userId?: string
  cityId?: string
  childAge?: number | null
  latitude?: number | null
  longitude?: number | null
  weatherFit?: string | null
  dateKey: string
}

function nil<T>(value: T | null | undefined): T | null {
  return value ?? null
}

function toIsoDate(value: string | Date | undefined): string | null {
  if (!value) {
    return null
  }
  return typeof value === "string" ? value : value.toISOString()
}

function roundedCoordinate(value: number | null | undefined): number | null {
  if (value == null) {
    return null
  }
  return Number(value.toFixed(4))
}

function sortedUnique(values: readonly string[] | undefined): readonly string[] {
  return Array.from(new Set(values ?? [])).toSorted()
}

function normalizeEventFilters(filters: EventFilters = {}) {
  return {
    cityId: nil(filters.cityId),
    dateFrom: nil(filters.dateFrom),
    dateTo: nil(filters.dateTo),
    ageMin: nil(filters.ageMin),
    ageMax: nil(filters.ageMax),
    isFree: nil(filters.isFree),
    tagSlugs: sortedUnique(filters.tagSlugs),
    keyword: sanitizePostgrestLike(filters.keyword ?? "") || null,
    isFeatured: nil(filters.isFeatured),
    status: filters.status ?? DEFAULT_EVENT_STATUS,
  } as const
}

function normalizeAdminEventsParams(
  keyword: string,
  status: Event["status"] | "all",
  cityFilter: "all" | "none" | string
) {
  return {
    keyword: sanitizePostgrestLike(keyword),
    status,
    cityFilter,
  } as const
}

function enrichedEvents(options: EnrichedEventsKeyOptions = {}) {
  const { cityId, userId, status = DEFAULT_EVENT_STATUS, eventIds, dateFrom, dateTo } = options

  if (eventIds) {
    return ["events-enriched", "by-ids", sortedUnique(eventIds), nil(userId)] as const
  }

  return [
    "events-enriched",
    {
      cityId: nil(cityId),
      status,
      userId: nil(userId),
      dateFrom: toIsoDate(dateFrom),
      dateTo: toIsoDate(dateTo),
    },
  ] as const
}

export const qk = {
  favorites: {
    all: ["favorites"] as const,
    byUser: (userId: string | undefined) => ["favorites", nil(userId)] as const,
  },
  calendarEvents: {
    all: ["calendar-events"] as const,
    byUser: (userId: string | undefined) => ["calendar-events", nil(userId)] as const,
  },
  ratings: {
    all: ["ratings"] as const,
    byEvent: (eventId: string | undefined) => ["ratings", nil(eventId)] as const,
    userEvent: (userId: string | undefined, eventId: string | undefined) =>
      ["rating", nil(userId), nil(eventId)] as const,
  },
  comments: {
    all: ["comments"] as const,
    byEvent: (eventId: string | undefined) => ["comments", nil(eventId)] as const,
  },
  userProfile: {
    all: ["user-profile"] as const,
    byUser: (userId: string | undefined) => ["user-profile", nil(userId)] as const,
  },
  cities: {
    all: ["cities"] as const,
    active: ["cities", "active"] as const,
  },
  tags: {
    all: ["tags"] as const,
  },
  events: {
    all: ["events"] as const,
    list: ({ filters = {}, userId, limit, offset }: EventsKeyOptions) =>
      ["events", normalizeEventFilters(filters), nil(userId), limit, offset] as const,
    detailAll: ["event"] as const,
    detailById: (eventId: string | undefined) => ["event", nil(eventId)] as const,
    detail: (eventId: string | undefined, userId?: string) =>
      ["event", nil(eventId), nil(userId)] as const,
    byIdsAll: ["events-by-id"] as const,
    byIds: (eventIds: readonly string[], userId?: string) =>
      ["events-by-id", sortedUnique(eventIds), nil(userId)] as const,
  },
  enrichedEvents: {
    all: ["events-enriched"] as const,
    key: enrichedEvents,
  },
  invites: {
    required: ["invites-required"] as const,
  },
  weather: {
    all: ["weather"] as const,
    byCoordinates: (latitude: number | null | undefined, longitude: number | null | undefined) =>
      [
        "weather",
        { latitude: roundedCoordinate(latitude), longitude: roundedCoordinate(longitude) },
      ] as const,
  },
  saturdayPlan: {
    all: ["saturday-plan"] as const,
    byContext: ({
      userId,
      cityId,
      childAge,
      latitude,
      longitude,
      weatherFit,
      dateKey,
    }: SaturdayPlanKeyOptions) =>
      [
        "saturday-plan",
        {
          userId: nil(userId),
          cityId: nil(cityId),
          childAge: childAge ?? null,
          latitude: roundedCoordinate(latitude),
          longitude: roundedCoordinate(longitude),
          weatherFit: weatherFit ?? null,
          dateKey,
        },
      ] as const,
  },
  admin: {
    root: ["admin"] as const,
    userAccess: ["admin", "user-access"] as const,
    cities: ["admin", "cities"] as const,
    comments: ["admin", "comments"] as const,
    eventAiTrace: (eventId: string | null | undefined) =>
      ["admin", "event-ai-trace", nil(eventId)] as const,
    sources: ["admin", "sources"] as const,
    sourceQueueSummary: ["admin", "source-queue-summary"] as const,
    deadSourceQueueRows: ["admin", "source-queue-dead"] as const,
    sourceRuns: ["admin", "source-runs"] as const,
    sourceRunErrors: (sourceIds: readonly string[]) =>
      ["admin", "source-run-errors", sortedUnique(sourceIds)] as const,
    stats: ["admin", "stats"] as const,
    events: {
      all: ["admin", "events"] as const,
      list: (
        keyword: string,
        status: Event["status"] | "all",
        cityFilter: "all" | "none" | string = "all"
      ) => ["admin", "events", normalizeAdminEventsParams(keyword, status, cityFilter)] as const,
      detail: (eventId: string | null | undefined) =>
        ["admin", "events", "detail", nil(eventId)] as const,
      audit: (eventId: string | null | undefined) =>
        ["admin", "events", "audit", nil(eventId)] as const,
      facets: (keyword: string) =>
        ["admin", "events", "facets", { keyword: sanitizePostgrestLike(keyword) }] as const,
    },
    ratings: ["admin", "ratings"] as const,
    inviteCodes: ["admin", "invite-codes"] as const,
    inviteRequests: (status?: "pending" | "approved" | "rejected" | "all") =>
      ["admin", "invite-requests", status ?? "all"] as const,
    tagQueueSummary: ["admin", "tag-queue-summary"] as const,
    deadTagQueueRows: ["admin", "tag-queue-dead"] as const,
    cronJobs: ["admin", "cron-jobs"] as const,
    cronHistory: (jobName?: string) =>
      jobName
        ? (["admin", "cron-history", jobName] as const)
        : (["admin", "cron-history"] as const),
    railwayCronJobs: ["admin", "railway-cron-jobs"] as const,
    railwayCronHistory: (label?: string) =>
      label
        ? (["admin", "railway-cron-history", label] as const)
        : (["admin", "railway-cron-history"] as const),
  },
} as const
