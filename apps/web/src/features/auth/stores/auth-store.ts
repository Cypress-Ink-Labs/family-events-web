import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { useShallow } from "zustand/react/shallow"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"
import {
  evaluateAccessState,
  getSessionExpiryTimeoutMs,
  isSessionExpired,
} from "@/lib/access-control"
import { subscribeExpiredAuthToken } from "@/lib/auth-events"
import { queryClient } from "@/lib/platform/query-client"
import { clearSentryUserContext, setSentryUserContext } from "@/lib/platform/sentry"
import type { UserAccess, UserProfile } from "@/lib/types"
import { PROFILE_REFRESH_INTERVAL_MS } from "@/shared/constants/time"
import { AUTH_ERROR_MESSAGES } from "@/features/auth/constants/messages"
import {
  claimPendingInviteAccess,
  loadProfileAndAccess,
} from "@/features/auth/api/load-profile-and-access"
import { accessDeniedMessage } from "@/features/auth/utils/access-denied-message"

function createAuthStoreRuntime() {
  return {
    expiryTimer: null as ReturnType<typeof setTimeout> | null,
    lastSyncedAccessToken: null as string | null,
    lastProfileFetchAt: 0,
    clearExpiryTimer() {
      if (this.expiryTimer) {
        clearTimeout(this.expiryTimer)
        this.expiryTimer = null
      }
    },
    reset() {
      this.clearExpiryTimer()
      this.lastSyncedAccessToken = null
      this.lastProfileFetchAt = 0
    },
  }
}

const authRuntime = createAuthStoreRuntime()

function authSyncFailureMessage(error: unknown): string {
  return error instanceof Error ? error.message : AUTH_ERROR_MESSAGES.sessionRestoreFailed
}

interface AuthStore {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  access: UserAccess | null
  authError: string | null
  isLoading: boolean

  _resetAuthState: () => void
  _syncSession: (session: Session | null, force?: boolean) => Promise<void>
  initAuth: () => () => void
  clearAuthError: () => void
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithProvider: (
    provider: "apple" | "google",
    options?: { next?: string }
  ) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>
  sendMagicLink: (email: string, shouldCreateUser: boolean) => Promise<{ error: Error | null }>
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set, get) => ({
      session: null,
      user: null,
      profile: null,
      access: null,
      authError: null,
      isLoading: true,

      _resetAuthState() {
        authRuntime.reset()
        set({ session: null, user: null, profile: null, access: null, authError: null })
        clearSentryUserContext()
        // Drop the previous user's cached data so the next user never sees it.
        queryClient.clear()
      },

      async _syncSession(sessionValue, force = false) {
        if (!sessionValue?.user) {
          get()._resetAuthState()
          return
        }

        if (isSessionExpired(sessionValue)) {
          await get().signOut()
          throw new Error("Session expired")
        }

        // Refresh expiry timer on every sync (cheap).
        authRuntime.clearExpiryTimer()
        const timeoutMs = getSessionExpiryTimeoutMs(sessionValue)
        if (timeoutMs !== null) {
          authRuntime.expiryTimer = setTimeout(() => {
            void get().signOut()
          }, timeoutMs)
        }

        // Always reflect the freshest session/user — keeps token expiry tracking current.
        set({ session: sessionValue, user: sessionValue.user, authError: null })

        const isNewToken = sessionValue.access_token !== authRuntime.lastSyncedAccessToken
        const profileStale =
          Date.now() - authRuntime.lastProfileFetchAt >= PROFILE_REFRESH_INTERVAL_MS

        // Cheap path: same token, fresh data, not forced.
        // Skips profile/access RPCs on hourly TOKEN_REFRESHED events.
        if (!force && !isNewToken && !profileStale) return

        // First sync of a new token: best-effort invite claim.
        if (isNewToken) {
          await claimPendingInviteAccess()
        }

        // Fetch profile + access. On network failure, fail-soft if we have
        // prior state; otherwise propagate (first-sync failure must surface
        // so signIn/UI can react instead of leaving the user in limbo).
        let profile: UserProfile | null = null
        let access: UserAccess | null = null
        try {
          ;({ profile, access } = await loadProfileAndAccess(sessionValue.user.id))
        } catch (error) {
          if (get().profile !== null) return
          throw error
        }

        // Access revocation is NOT fail-soft — sign out immediately.
        const accessState = evaluateAccessState({ user: { id: sessionValue.user.id } }, access)
        if (!accessState.isAllowed) {
          await get().signOut()
          throw new Error(accessDeniedMessage(accessState.reason))
        }

        authRuntime.lastSyncedAccessToken = sessionValue.access_token
        authRuntime.lastProfileFetchAt = Date.now()
        set({ profile, access })
        setSentryUserContext({
          id: sessionValue.user.id,
          role: profile?.role,
          accessEnabled: access?.is_enabled,
        })
      },

      initAuth() {
        let destroyed = false

        void supabase.auth.getSession().then(({ data: { session } }) => {
          if (destroyed) return
          get()
            ._syncSession(session)
            .catch((error) => {
              if (destroyed) return
              get()._resetAuthState()
              set({ authError: authSyncFailureMessage(error) })
            })
            .finally(() => set({ isLoading: false }))
        })

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "INITIAL_SESSION") return
          if (event === "TOKEN_REFRESHED" && !session) {
            get()._resetAuthState()
            return
          }
          set({ isLoading: true })
          void get()
            ._syncSession(session)
            .catch((error) => {
              if (destroyed) return
              get()._resetAuthState()
              set({ authError: authSyncFailureMessage(error) })
            })
            .finally(() => set({ isLoading: false }))
        })

        return () => {
          destroyed = true
          authRuntime.clearExpiryTimer()
          subscription.unsubscribe()
        }
      },

      clearAuthError() {
        set({ authError: null })
      },

      async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (!error && data.session) {
          try {
            await get()._syncSession(data.session)
          } catch (authError) {
            return {
              error: authError instanceof Error ? authError : new Error("Sign in failed"),
            }
          }
        }
        return { error }
      },

      async signInWithProvider(provider, options) {
        // Hosted OAuth bounces the browser to the provider, then back to
        // /auth/callback with a #access_token URL hash. The callback page hands
        // the session to supabase-js which fires onAuthStateChange → _syncSession.
        //
        // Closed-beta OAuth is enforced server-side by the
        // private.enforce_invited_oauth_signup auth.users trigger. If invites are
        // required and no pending_invite_claims row exists for this email, Supabase
        // rejects new Google/Apple users before profile/access rows are created.
        const callback = new URL(`${window.location.origin}/auth/callback`)
        if (options?.next) {
          callback.searchParams.set("next", options.next)
        }
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: callback.toString(),
            // Apple: scopes default to "email name" — sufficient for our display_name.
            // Google: also defaults to email + profile.
            queryParams:
              provider === "google" ? { access_type: "offline", prompt: "consent" } : undefined,
          },
        })
        return { error: error ?? null }
      },

      async signUp(email, password, displayName) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        })
        if (!error && data.session) {
          try {
            await get()._syncSession(data.session)
          } catch (authError) {
            return {
              error: authError instanceof Error ? authError : new Error("Sign up failed"),
            }
          }
        }
        return { error }
      },

      async signOut() {
        await supabase.auth.signOut()
        get()._resetAuthState()
      },

      async refreshProfile() {
        const { session } = get()
        if (!session) return
        // force=true bypasses dedup so callers can guarantee a fresh fetch.
        await get()._syncSession(session, true)
      },

      async resetPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        return { error }
      },

      async updatePassword(newPassword) {
        const { data, error } = await supabase.auth.updateUser({ password: newPassword })
        if (!error && data.user) {
          // Pick up the freshly-rotated token so subsequent requests use it.
          const { data: sessionData } = await supabase.auth.getSession()
          if (sessionData.session) {
            await get()._syncSession(sessionData.session, true)
          }
        }
        return { error }
      },

      async sendMagicLink(email, shouldCreateUser) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser,
            emailRedirectTo: `${window.location.origin}/`,
          },
        })
        return { error }
      },
    }),
    { name: "auth" }
  )
)

subscribeExpiredAuthToken(() => {
  void useAuthStore.getState().signOut()
})

export function useAuth() {
  return useAuthStore(
    useShallow((s) => ({
      session: s.session,
      user: s.user,
      profile: s.profile,
      access: s.access,
      authError: s.authError,
      isAdmin: s.profile?.role === "admin",
      isEnabled: s.access?.is_enabled === true,
      isLoading: s.isLoading,
      clearAuthError: s.clearAuthError,
      signIn: s.signIn,
      signInWithProvider: s.signInWithProvider,
      signUp: s.signUp,
      signOut: s.signOut,
      refreshProfile: s.refreshProfile,
      resetPassword: s.resetPassword,
      updatePassword: s.updatePassword,
      sendMagicLink: s.sendMagicLink,
    }))
  )
}
