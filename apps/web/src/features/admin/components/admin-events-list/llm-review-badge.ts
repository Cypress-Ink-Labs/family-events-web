import type { Event } from "@/shared/types"
import { LLM_EVENT_REVIEW_DECISION, LLM_EVENT_REVIEW_STATUS } from "@/shared/constants/llm-review"

/**
 * Builds the LLM-review badge text + class for a draft event. Returns null
 * when no badge applies (status unset or not required).
 *
 * Extracted from `AdminVirtualEventRow` so the per-decision class map and
 * confidence formatting live in one focused, testable spot.
 */
export function buildLlmReviewBadge(event: Event): { text: string; className: string } | null {
  if (
    !event.llm_review_status ||
    event.llm_review_status === LLM_EVENT_REVIEW_STATUS.NOT_REQUIRED
  ) {
    return null
  }

  const confidenceText =
    event.llm_review_confidence == null ? null : Number(event.llm_review_confidence).toFixed(2)

  if (event.llm_review_status === LLM_EVENT_REVIEW_STATUS.FAILED) {
    return {
      text: "LLM failed",
      className: "text-destructive border-destructive/30 bg-destructive/10",
    }
  }

  if (event.llm_review_decision === LLM_EVENT_REVIEW_DECISION.APPROVE) {
    return {
      text: `LLM approved${confidenceText ? ` · ${confidenceText}` : ""}`,
      className:
        "text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-900/40 dark:bg-emerald-950/30",
    }
  }

  if (event.llm_review_decision === LLM_EVENT_REVIEW_DECISION.REJECT) {
    return {
      text: `LLM rejected${confidenceText ? ` · ${confidenceText}` : ""}`,
      className:
        "text-rose-700 border-rose-200 bg-rose-50 dark:text-rose-300 dark:border-rose-900/40 dark:bg-rose-950/30",
    }
  }

  return {
    text: `Needs review${confidenceText ? ` · ${confidenceText}` : ""}`,
    className:
      "text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-300 dark:border-amber-900/40 dark:bg-amber-950/30",
  }
}
