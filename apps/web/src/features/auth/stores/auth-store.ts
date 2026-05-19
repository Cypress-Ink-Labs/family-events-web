import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { useShallow } from "zustand/react/shallow"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import {
  evaluateAccessState,
  getSessionExpiryTimeoutMs,
  isSessionExpired,
} from "@/lib/access-control"
import { queryClient, registerAuthErrorHandler } from "@/lib/query-client"
import { clearSentryUserContext, Sentry, setSentryUserContext } from "@/lib/sentry"
import type { UserAccess, UserProfile } from "@/lib/types"

const PROFILE_REFRESH_INTERVAL_MS = 5 * 60_000

// Module-level refs replace useRef — store is a module-level singleton.
let expiryTimer: ReturnType<typeof setTimeout> | null = null
let lastSyncedAccessToken: string | null = null
let lastProfileFetchAt = 0

interface AuthStore {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  access: UserAccess | null
  isLoading: boolean

  _resetAuthState: () => void
  _syncSession: (session: Session | null, force?: boolean) => Promise<void>
  initAuth: () => () => void
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithProvider: (provider: "apple" | "google") => Promise<{ error: Error | null }>
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
      isLoading: true,

      _resetAuthState() {
        if (expiryTimer) {
          clearTimeout(expiryTimer)
          expiryTimer = null
        }
        lastSyncedAccessToken = null
        lastProfileFetchAt = 0
        set({ session: null, user: null, profile: null, access: null })
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
        if (expiryTimer) {
          clearTimeout(expiryTimer)
          expiryTimer = null
        }
        const timeoutMs = getSessionExpiryTimeoutMs(sessionValue)
        if (timeoutMs !== null) {
          expiryTimer = setTimeout(() => {
            void get().signOut()
          }, timeoutMs)
        }

        // Always reflect the freshest session/user — keeps token expiry tracking current.
        set({ session: sessionValue, user: sessionValue.user })

        const isNewToken = sessionValue.access_token !== lastSyncedAccessToken
        const profileStale = Date.now() - lastProfileFetchAt >= PROFILE_REFRESH_INTERVAL_MS

        // Cheap path: same token, fresh data, not forced.
        // Skips profile/access RPCs on hourly TOKEN_REFRESHED events.
        if (!force && !isNewToken && !profileStale) return

        // First sync of a new token: best-effort invite claim.
        if (isNewToken) {
          try {
            await supabase.rpc("claim_pending_invite_access")
          } catch {
            // Non-fatal; auth state should still load if this RPC fails.
          }
        }

        // Fetch profile + access. On network failure, fail-soft if we have
        // prior state; otherwise propagate (first-sync failure must surface
        // so signIn/UI can react instead of leaving the user in limbo).
        let profile: UserProfile | null = null
        let access: UserAccess | null = null
        try {
          const [profileResult, accessResult] = await Promise.all([
            supabase.from("user_profiles").select("*").eq("id", sessionValue.user.id).maybeSingle(),
            supabase
              .from("user_access")
              .select("*")
              .eq("user_id", sessionValue.user.id)
              .maybeSingle(),
          ])
          if (profileResult.error) throw profileResult.error
          if (accessResult.error) throw accessResult.error
          profile = (profileResult.data ?? null) as UserProfile | null
          access = (accessResult.data ?? null) as UserAccess | null
        } catch (error) {
          Sentry.captureException(error, { tags: { area: "auth.syncSession" } })
          if (get().profile !== null) return
          throw error instanceof Error ? error : new Error("Failed to load profile")
        }

        // Access revocation is NOT fail-soft — sign out immediately.
        const accessState = evaluateAccessState({ user: { id: sessionValue.user.id } }, access)
        if (!accessState.isAllowed) {
          await get().signOut()
          throw new Error(
            accessState.reason === "disabled"
              ? "Your account has been disabled."
              : accessState.reason === "missing-access"
                ? "Your account does not have access yet."
                : "Sign in required."
          )
        }

        lastSyncedAccessToken = sessionValue.access_token
        lastProfileFetchAt = Date.now()
        set({ profile, access })
        setSentryUserContext({
          id: sessionValue.user.id,
          role: profile?.role,
          accessEnabled: access?.is_enabled,
        })
      },

      initAuth() {
        let destroyed = false
        const unregisterAuthErrorHandler = registerAuthErrorHandler(() => {
          // PGRST301 / expired JWT from any query/mutation → single sign-out path.
          void get().signOut()
        })

        void supabase.auth.getSession().then(({ data: { session } }) => {
          if (destroyed) return
          get()
            ._syncSession(session)
            .catch(() => {})
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
            .catch(() => {})
            .finally(() => set({ isLoading: false }))
        })

        return () => {
          destroyed = true
          if (expiryTimer) clearTimeout(expiryTimer)
          unregisterAuthErrorHandler()
          subscription.unsubscribe()
        }
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

      async signInWithProvider(provider) {
        // Hosted OAuth bounces the browser to the provider, then back to
        // /auth/callback with a #access_token URL hash. The callback page hands
        // the session to supabase-js which fires onAuthStateChange → _syncSession.
        //
        // KNOWN LIMITATION: this path bypasses the invite-only gate that
        // password/magic-link signup enforces via pending_invite_claims.
        // Production hardening is tracked in docs/auth-providers.md §4 — the
        // canonical fix is an auth.users INSERT trigger that rejects new
        // OAuth users when invites_required = true AND no claim row exists
        // for their email. Until that lands, treat OAuth as "any Apple/Google
        // account creates a user" — acceptable for staging, NOT for closed
        // beta.
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
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

export function useAuth() {
  return useAuthStore(
    useShallow((s) => ({
      session: s.session,
      user: s.user,
      profile: s.profile,
      access: s.access,
      isAdmin: s.profile?.role === "admin",
      isEnabled: s.access?.is_enabled === true,
      isLoading: s.isLoading,
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
