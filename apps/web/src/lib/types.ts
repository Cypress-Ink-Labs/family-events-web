export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]
export type AiTagProvider = "openai" | "ollama" | "localai"
export type AiTagStatus = "success" | "fallback" | "error"

export interface Database {
  public: {
    Tables: {
      user_access: {
        Row: UserAccess
        Insert: Omit<UserAccess, "created_at" | "updated_at">
        Update: Partial<Omit<UserAccess, "user_id" | "created_at">>
      }
      invite_codes: {
        Row: InviteCode
        Insert: Omit<InviteCode, "created_at" | "used_count">
        Update: Partial<Omit<InviteCode, "code" | "created_at">>
      }
      cities: {
        Row: City
        Insert: Omit<City, "id" | "created_at">
        Update: Partial<Omit<City, "id" | "created_at">>
      }
      tags: {
        Row: Tag
        Insert: Omit<Tag, "id" | "created_at">
        Update: Partial<Omit<Tag, "id" | "created_at">>
      }
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, "created_at" | "updated_at">
        Update: Partial<Omit<UserProfile, "id" | "created_at">>
      }
      event_sources: {
        Row: EventSource
        Insert: Omit<EventSource, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<EventSource, "id" | "created_at">>
      }
      source_runs: {
        Row: SourceRun
        Insert: Omit<SourceRun, "id" | "created_at">
        Update: Partial<Omit<SourceRun, "id" | "created_at">>
      }
      events: {
        Row: Event
        Insert: Omit<Event, "id" | "created_at" | "updated_at" | "view_count" | "search_vector">
        Update: Partial<Omit<Event, "id" | "created_at" | "search_vector">>
      }
      event_tags: {
        Row: EventTag
        Insert: EventTag
        Update: Partial<EventTag>
      }
      favorites: {
        Row: Favorite
        Insert: Omit<Favorite, "id" | "created_at">
        Update: never
      }
      user_calendar_events: {
        Row: UserCalendarEvent
        Insert: Omit<UserCalendarEvent, "id" | "added_at">
        Update: Partial<Omit<UserCalendarEvent, "id">>
      }
      ratings: {
        Row: Rating
        Insert: Omit<Rating, "id" | "created_at">
        Update: Partial<Omit<Rating, "id" | "created_at">>
      }
      comments: {
        Row: Comment
        Insert: Omit<Comment, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Comment, "id" | "created_at">>
      }
      recommendation_signals: {
        Row: RecommendationSignal
        Insert: Omit<RecommendationSignal, "id" | "created_at">
        Update: never
      }
      admin_audit_log: {
        Row: AdminAuditLog
        Insert: Omit<AdminAuditLog, "id" | "created_at">
        Update: never
      }
      event_ai_traces: {
        Row: EventAiTrace
        Insert: Omit<EventAiTrace, "id" | "created_at">
        Update: never
      }
    }
  }
}

export interface InviteCode {
  id: string
  max_uses: number
  used_count: number
  expires_at: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

// Returned ONCE by admin_create_invite_code RPC. The plaintext `code` field is
// the only chance to surface it to the admin — it is never stored in the DB
// and cannot be retrieved later.
export interface CreatedInviteCode {
  id: string
  code: string
  max_uses: number
  expires_at: string | null
  notes: string | null
  created_at: string
}

export type InviteRequestStatus = "pending" | "approved" | "rejected"

export interface InviteRequest {
  id: string
  email: string
  message: string | null
  status: InviteRequestStatus
  invite_code_id: string | null
  admin_notes: string | null
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

// Returned by admin_approve_invite_request — plaintext code is shown to the
// admin ONCE through the same reveal panel as admin_create_invite_code.
export interface ApprovedInviteRequest {
  request_id: string
  code: string
  invite_code_id: string
  email: string
  created_at: string
}

export interface UserAccess {
  user_id: string
  is_enabled: boolean
  enabled_at: string | null
  disabled_at: string | null
  disabled_reason: string | null
  created_at: string
  updated_at: string
}

export interface City {
  id: string
  name: string
  state: string | null
  country: string
  slug: string
  is_active: boolean
  latitude: number | null
  longitude: number | null
  timezone: string
  created_at: string
}

export interface Tag {
  id: string
  name: string
  slug: string
  color: string
  category: string
  is_system: boolean
  created_at: string
}

export interface UserProfile {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  role: "user" | "admin"
  city_preference_id: string | null
  child_name: string | null
  child_age: number | null
  created_at: string
  updated_at: string
}

export interface EventSource {
  id: string
  name: string
  url: string
  source_type: "website" | "ical" | "rss" | "manual" | "macaronikid"
  city_id: string | null
  is_active: boolean
  auto_approve: boolean
  scrape_interval_hours: number
  last_scraped_at: string | null
  last_status: "pending" | "success" | "error" | "partial" | null
  error_count: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SourceRun {
  id: string
  source_id: string | null
  started_at: string
  completed_at: string | null
  status: "running" | "success" | "error" | "partial"
  events_found: number
  events_imported: number
  events_skipped: number
  error_log: string | null
  created_at: string
}

export interface Event {
  id: string
  title: string
  description: string | null
  start_datetime: string
  end_datetime: string | null
  timezone: string
  venue_name: string | null
  address: string | null
  city_id: string | null
  latitude: number | null
  longitude: number | null
  age_min: number | null
  age_max: number | null
  price: number | null
  is_free: boolean
  source_url: string | null
  source_name: string | null
  source_id: string | null
  images: string[]
  status: "draft" | "published" | "rejected" | "archived"
  ai_confidence: number | null
  ai_tag_provider: AiTagProvider | null
  ai_tag_model: string | null
  ai_tag_status: AiTagStatus | null
  recurrence_info: Json | null
  is_featured: boolean
  is_outdoor: boolean | null
  view_count: number
  search_vector: string | null
  admin_locked_fields: string[]
  admin_last_edited_at: string | null
  admin_last_edited_by: string | null
  created_at: string
  updated_at: string
}

export interface EventAiTracePredictedTag {
  slug: string
  confidence: number
  reason: string | null
  matched_keywords?: string[]
}

export interface EventAiTracePredictedFields {
  age_min: number | null
  age_max: number | null
  price: number | null
  is_free: boolean | null
  venue_name: string | null
}

export interface EventAiTrace {
  id: string
  event_id: string
  source_run_id: string | null
  trigger_type: "import" | "reclassify" | "manual-review"
  provider: AiTagProvider | null
  model: string | null
  status: AiTagStatus
  input_title: string
  input_description: string | null
  available_tag_slugs: Json | null
  predicted_tags: Json | null
  predicted_fields: Json | null
  reasoning_summary: string | null
  fallback_reason: string | null
  processing_ms: number | null
  created_at: string
}

export interface EventAiTraceWithParsed extends EventAiTrace {
  parsed_predicted_tags: EventAiTracePredictedTag[]
  parsed_predicted_fields: EventAiTracePredictedFields | null
}

export interface EventWithDetails extends Event {
  city?: City | null
  tags?: (EventTag & { tag: Tag })[]
  avg_rating?: number
  rating_count?: number
  is_favorited?: boolean
  is_in_calendar?: boolean
}

export interface EventTag {
  event_id: string
  tag_id: string
  confidence: number
  is_manual_override: boolean
  created_at: string
}

export interface Favorite {
  id: string
  user_id: string
  event_id: string
  created_at: string
}

export interface UserCalendarEvent {
  id: string
  user_id: string
  event_id: string
  added_at: string
  notes: string | null
}

export interface Rating {
  id: string
  user_id: string
  event_id: string
  score: number
  created_at: string
}

export interface Comment {
  id: string
  user_id: string
  event_id: string
  body: string
  is_approved: boolean
  is_flagged: boolean
  created_at: string
  updated_at: string
}

export interface CommentWithProfile extends Comment {
  user_profiles?: Pick<UserProfile, "display_name" | "avatar_url">
}

export interface RecommendationSignal {
  id: string
  user_id: string
  event_id: string
  signal_type: "view" | "favorite" | "calendar" | "rate" | "comment"
  weight: number
  created_at: string
}

export interface AdminAuditLog {
  id: string
  admin_user_id: string
  action: string
  target_type: string | null
  target_id: string | null
  metadata: Json | null
  created_at: string
}

export interface EventFilters {
  cityId?: string
  dateFrom?: string
  dateTo?: string
  ageMin?: number
  ageMax?: number
  isFree?: boolean
  tagSlugs?: string[]
  keyword?: string
  isFeatured?: boolean
  status?: Event["status"]
}
