import type { evaluateAccessState } from "@/lib/access-control"

type AccessState = ReturnType<typeof evaluateAccessState>

/**
 * User-facing message for the three deny reasons returned by
 * `evaluateAccessState`. Centralizes the copy so wording is reviewable in
 * one place rather than reading like a chain of ternaries inside the store.
 */
export function accessDeniedMessage(reason: AccessState["reason"]): string {
  switch (reason) {
    case "disabled":
      return "Your account has been disabled."
    case "missing-access":
      return "Your account does not have access yet."
    default:
      return "Sign in required."
  }
}
