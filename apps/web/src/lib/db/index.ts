/**
 * Re-exports Supabase-generated schema types plus short aliases.
 * Regenerated schema lives in `database.types.ts` (`pnpm db:types`); import from here in app code.
 */
import type {
  CompositeTypes,
  Database,
  Enums,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "../database.types"

export type { CompositeTypes, Database, Enums, Json, Tables, TablesInsert, TablesUpdate }

export type AdminAuditLogRow = Tables<"admin_audit_log">
export type CityRow = Tables<"cities">
export type CommentRow = Tables<"comments">
export type EventAiTraceRow = Tables<"event_ai_traces">
export type EventRow = Tables<"events">
export type EventSourceRow = Tables<"event_sources">
export type EventTagRow = Tables<"event_tags">
export type FavoriteRow = Tables<"favorites">
export type InviteCodeRow = Tables<"invite_codes">
export type InviteRequestRow = Tables<"invite_requests">
export type PublicEventRow = Tables<"public_events">
export type RatingRow = Tables<"ratings">
export type RecommendationSignalRow = Tables<"recommendation_signals">
export type SourceRunRow = Tables<"source_runs">
export type TagRow = Tables<"tags">
export type UserAccessRow = Tables<"user_access">
export type UserCalendarEventRow = Tables<"user_calendar_events">
export type UserProfileRow = Tables<"user_profiles">
export type PlanEventsRow =
  Database["public"]["Functions"]["plan_events_for_user"]["Returns"][number]

export type { DbError, DbErrorKind } from "./errors"
export { fetchEventsPage } from "./rpc-events"
export type { EventsCursor, EventsPageFilters } from "./rpc-events"
export { fetchAdminEventsPage } from "./rpc-admin-events"
export type {
  AdminEventsCursor,
  AdminEventsFilters,
  AdminEventsPageResult,
  AdminEventFacetRow,
} from "./rpc-admin-events"
