import * as Sentry from "@sentry/react"
import { env } from "@/env"

const SENTRY_DSN = env.VITE_SENTRY_DSN
const APP_ENV = env.VITE_APP_ENV ?? import.meta.env.MODE
const SENTRY_TRACES_SAMPLE_RATE = env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0
const SENTRY_REPLAYS_SESSION_SAMPLE_RATE = env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? 0
const SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE = env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? 0

interface RedactedSentryUserContext {
  id: string
  role?: string | null
  accessEnabled?: boolean | null
}

function hasSentryDsn(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function redactUrl(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.search = ""
    parsed.hash = ""
    return parsed.toString()
  } catch {
    try {
      const parsed = new URL(url, "http://localhost")
      parsed.search = ""
      parsed.hash = ""
      return parsed.toString()
    } catch {
      return url.replace(/[?#].*$/, "")
    }
  }
}

export function initSentry() {
  if (!hasSentryDsn(SENTRY_DSN)) {
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: APP_ENV,
    release: env.VITE_SENTRY_RELEASE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.httpClientIntegration(),
      Sentry.globalHandlersIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.dedupeIntegration(),
    ],
    tracePropagationTargets: ["localhost"],
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    replaysSessionSampleRate: SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
    replaysOnErrorSampleRate: SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
    sendDefaultPii: false,
    enableLogs: false,
    ignoreErrors: [
      "ResizeObserver loop completed with undelivered notifications.",
      "Network request failed",
      "Load failed",
    ],
    denyUrls: [/extensions\//i, /^chrome:\/\//i, /^moz-extension:\/\//i],
    beforeSend(event) {
      if (event.request?.url) {
        event.request.url = redactUrl(event.request.url)
      }

      return event
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.type === "http" && breadcrumb.data?.url) {
        return {
          ...breadcrumb,
          data: {
            ...breadcrumb.data,
            url: redactUrl(String(breadcrumb.data.url)),
          },
        }
      }

      return breadcrumb
    },
  })
}

export function setSentryUserContext(user: RedactedSentryUserContext) {
  Sentry.setUser({
    id: user.id,
    role: user.role ?? undefined,
    access_enabled: user.accessEnabled ?? undefined,
  })
}

export function clearSentryUserContext() {
  Sentry.setUser(null)
}

export { Sentry }
