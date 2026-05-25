import type {
  AdminAuditLogRow,
  CityRow,
  CommentRow,
  EventAiTraceRow,
  EventRow,
  EventSourceRow,
  EventTagRow,
  FavoriteRow,
  InviteCodeRow,
  InviteRequestRow,
  Json as DbJson,
  RatingRow,
  RecommendationSignalRow,
  SourceRunRow,
  TagRow,
  UserAccessRow,
  UserCalendarEventRow,
  UserProfileRow,
} from "@/lib/db"
import type {
  EventProcessingMode as DbEventProcessingMode,
  EventTagQueueStatus as DbEventTagQueueStatus,
  InviteRequestStatus as DbInviteRequestStatus,
  LlmEventReviewDecision as DbLlmEventReviewDecision,
  LlmEventReviewStatus as DbLlmEventReviewStatus,
  SourceExtractionMode,
  SourceScrapeQueueStatus as DbSourceScrapeQueueStatus,
} from "@family-events/contracts"

type Override<Row, Fields> = Omit<Row, keyof Fields> & Fields

export type Json = DbJson
export type AiTagProvider = "openai" | "ollama" | "localai"
export type AiTagStatus = "success" | "fallback" | "error"
export type EventStatus = "draft" | "published" | "rejected" | "archived"
export type ExtractionMode = SourceExtractionMode
export type EventProcessingMode = DbEventProcessingMode
export type LlmEventReviewStatus = DbLlmEventReviewStatus
export type LlmEventReviewDecision = DbLlmEventReviewDecision
export type InviteRequestStatus = DbInviteRequestStatus
export type TagQueueStatus = DbEventTagQueueStatus
export type SourceQueueStatus = DbSourceScrapeQueueStatus
export type SourceLastStatus = "pending" | "success" | "error" | "partial" | null
export type SourceType = "website" | "ical" | "rss" | "manual" | "macaronikid" | "brec"
export type UserRole = "user" | "admin"

export type UserAccess = Override<UserAccessRow, { access_expires_at?: string | null }>
export type City = CityRow
export type Tag = TagRow
export type EventTag = EventTagRow
export type Favorite = FavoriteRow
export type UserCalendarEvent = UserCalendarEventRow
export type Rating = RatingRow
export type Comment = CommentRow
export type AdminAuditLog = AdminAuditLogRow

export type InviteCode = Pick<
  InviteCodeRow,
  "id" | "max_uses" | "used_count" | "expires_at" | "notes" | "created_by" | "created_at"
>

export type InviteRequest = InviteRequestRow

export interface CreatedInviteCode {
  id: string
  code: string
  max_uses: number
  expires_at: string | null
  notes: string | null
  created_at: string
}

export interface ApprovedInviteRequest {
  request_id: string
  code: string
  invite_code_id: string
  email: string
  created_at: string
}

export type UserProfile = Override<UserProfileRow, { role: UserRole }>

export type EventSource = Override<
  Omit<EventSourceRow, "date_window_days">,
  {
    source_type: SourceType
    last_status: SourceLastStatus
    processing_mode: EventProcessingMode
  }
>

export type SourceRun = Override<
  SourceRunRow,
  { status: "running" | "success" | "error" | "partial" }
>

export interface ParentTip {
  category: string
  text: string
}

export interface UnsplashImageAttribution {
  provider: "unsplash"
  image_url: string
  matched_tag: string | null
  photo_id: string
  photographer_name: string
  photographer_username: string
  photographer_profile_url: string
  photo_url: string
}

export type Event = Override<
  EventRow,
  {
    images: string[]
    status: EventStatus
    ai_tag_provider: AiTagProvider | null
    ai_tag_status: AiTagStatus | null
    search_vector: string | null
    is_outdoor: boolean | null
    image_attributions?: UnsplashImageAttribution[]
    parent_tips?: ParentTip[] | null
    parent_tips_generated_at?: string | null
    parent_tips_provider?: string | null
    parent_tips_model?: string | null
    parent_tips_prompt_version?: string | null
    llm_review_status?: LlmEventReviewStatus | null
    llm_review_decision?: LlmEventReviewDecision | null
    llm_review_confidence?: number | null
    llm_review_reason?: string | null
    llm_review_flags?: string[]
    llm_review_provider?: string | null
    llm_review_model?: string | null
    llm_review_prompt_version?: string | null
    llm_reviewed_at?: string | null
    llm_review_error?: string | null
  }
>

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

export type EventAiTrace = Override<
  EventAiTraceRow,
  {
    trigger_type: "import" | "reclassify" | "manual-review"
    provider: AiTagProvider | null
    status: AiTagStatus
    available_tag_slugs: Json | null
    predicted_tags: Json | null
    predicted_fields: Json | null
  }
>

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

export interface CommentWithProfile extends Comment {
  user_profiles?: Pick<UserProfile, "display_name" | "avatar_url">
}

export type RecommendationSignal = Override<
  RecommendationSignalRow,
  { signal_type: "view" | "favorite" | "calendar" | "rate" | "comment" }
>

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
