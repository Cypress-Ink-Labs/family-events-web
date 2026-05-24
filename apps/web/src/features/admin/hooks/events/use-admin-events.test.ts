import { describe, expect, it } from "vitest"
import {
  ADMIN_LLM_REVIEW_FILTER,
  LLM_EVENT_REVIEW_DECISION,
  LLM_EVENT_REVIEW_STATUS,
} from "@/shared/constants/llm-review"
import { getAdminLlmReviewFilters } from "./use-admin-events"

describe("getAdminLlmReviewFilters", () => {
  it("scopes needs-admin-review to unresolved successful reviews", () => {
    expect(getAdminLlmReviewFilters(ADMIN_LLM_REVIEW_FILTER.NEEDS_ADMIN_REVIEW)).toEqual({
      llmReviewStatus: LLM_EVENT_REVIEW_STATUS.SUCCEEDED,
      llmReviewDecision: LLM_EVENT_REVIEW_DECISION.NEEDS_ADMIN_REVIEW,
    })
  })

  it("keeps failed reviews separate from needs-admin-review", () => {
    expect(getAdminLlmReviewFilters(ADMIN_LLM_REVIEW_FILTER.FAILED)).toEqual({
      llmReviewStatus: LLM_EVENT_REVIEW_STATUS.FAILED,
    })
  })
})
