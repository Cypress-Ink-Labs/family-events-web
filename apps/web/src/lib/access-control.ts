import type { UserAccess } from "@/lib/types"

export const HOME_PATH = "/home"

const PUBLIC_PATHS = new Set(["/", "/sign-in", "/sign-up"])

export type AccessReason = "allowed" | "signed-out" | "missing-access" | "disabled"

interface SessionLike {
  user?: { id: string }
  expires_at?: number | null
}

export function isSessionExpired(
  session: SessionLike | null,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  if (!session?.expires_at) {
    return false
  }

  return session.expires_at <= nowSeconds
}

export function getSessionExpiryTimeoutMs(
  session: SessionLike | null,
  nowMs = Date.now()
): number | null {
  if (!session?.expires_at) {
    return null
  }

  return Math.max(session.expires_at * 1000 - nowMs, 0)
}

export function evaluateAccessState(
  session: SessionLike | null,
  access: UserAccess | null
): {
  isAllowed: boolean
  shouldSignOut: boolean
  reason: AccessReason
} {
  if (!session?.user) {
    return {
      isAllowed: false,
      shouldSignOut: false,
      reason: "signed-out",
    }
  }

  if (!access) {
    return {
      isAllowed: false,
      shouldSignOut: true,
      reason: "missing-access",
    }
  }

  if (!access.is_enabled) {
    return {
      isAllowed: false,
      shouldSignOut: true,
      reason: "disabled",
    }
  }

  return {
    isAllowed: true,
    shouldSignOut: false,
    reason: "allowed",
  }
}

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname)
}
