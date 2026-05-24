import {
  LLM_EVENT_REVIEW_DECISION,
  LLM_EVENT_REVIEW_DECISIONS,
  LLM_EVENT_REVIEW_STATUS,
  LLM_EVENT_REVIEW_STATUSES,
} from "@family-events/contracts"

export {
  LLM_EVENT_REVIEW_DECISION,
  LLM_EVENT_REVIEW_DECISIONS,
  LLM_EVENT_REVIEW_STATUS,
  LLM_EVENT_REVIEW_STATUSES,
}

export const ADMIN_LLM_REVIEW_FILTER = {
  ALL: "all",
  REVIEWED: "reviewed",
  APPROVED: "approved",
  REJECTED: "rejected",
  NEEDS_ADMIN_REVIEW: "needs_admin_review",
  FAILED: "failed",
} as const

export type AdminLlmReviewFilter =
  (typeof ADMIN_LLM_REVIEW_FILTER)[keyof typeof ADMIN_LLM_REVIEW_FILTER]

export const ADMIN_LLM_REVIEW_FILTER_OPTIONS: readonly {
  value: AdminLlmReviewFilter
  label: string
}[] = [
  { value: ADMIN_LLM_REVIEW_FILTER.ALL, label: "All" },
  { value: ADMIN_LLM_REVIEW_FILTER.REVIEWED, label: "LLM reviewed" },
  { value: ADMIN_LLM_REVIEW_FILTER.APPROVED, label: "LLM approved" },
  { value: ADMIN_LLM_REVIEW_FILTER.REJECTED, label: "LLM rejected" },
  { value: ADMIN_LLM_REVIEW_FILTER.NEEDS_ADMIN_REVIEW, label: "Needs Admin Review" },
  { value: ADMIN_LLM_REVIEW_FILTER.FAILED, label: "LLM failed" },
] as const
