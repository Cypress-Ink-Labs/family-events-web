/**
 * User-facing copy for auth flows. Centralized so wording, casing, and tone
 * are reviewable in one place rather than spread across page/form/store files.
 */

export const AUTH_ERROR_MESSAGES = {
  sessionRestoreFailed: "Unable to restore your session.",
  signInFailedTitle: "Sign in failed",
  signInFallback: "Please try again.",
  signInInterruptedTitle: "Sign in interrupted",
  oauthFailedTitle: "Couldn't finish sign-in",
  oauthFailedDescription:
    "The provider redirect didn't complete. Try again, or use a different method.",
  providerInviteRequiredTitle: "Invite required",
  magicLinkSendFailedTitle: "Couldn't send link",
  magicLinkSendFailedFallback: "Try again in a minute.",
  oauthProviderFailedFallback: "Try again or use a different method.",
  welcomeBack: "Welcome back!",
} as const

export const OAUTH_CALLBACK_FAILED_FLAG = "oauth_failed"
