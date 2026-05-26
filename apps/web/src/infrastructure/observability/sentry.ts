import type { Scope as SentryScope } from "@sentry/react"

type SentryModule = typeof import("@sentry/react")
type CaptureContext = Parameters<SentryModule["captureException"]>[1]

interface RedactedSentryUserContext {
  id: string
  role?: string | null
  accessEnabled?: boolean | null
}

interface SentryEnv {
  dsn?: string
  appEnv: string
  release?: string
  tracesSampleRate: number
  replaysSessionSampleRate: number
  replaysOnErrorSampleRate: number
}

function readOptionalEnv(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined
}

function readOptionalUrlEnv(value: unknown, name: string): string | undefined {
  const raw = readOptionalEnv(value)
  if (!raw) return undefined

  try {
    return new URL(raw).toString()
  } catch {
    throw new Error(`Invalid ${name}`)
  }
}

function readSampleRate(value: unknown, name: string): number {
  const raw = readOptionalEnv(value)
  if (!raw) return 0

  const rate = Number(raw)
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new Error(`Invalid ${name}`)
  }
  return rate
}

function readSentryEnv(): SentryEnv {
  return {
    dsn: readOptionalUrlEnv(import.meta.env.VITE_SENTRY_DSN, "VITE_SENTRY_DSN"),
    appEnv: readOptionalEnv(import.meta.env.VITE_APP_ENV) ?? import.meta.env.MODE,
    release: readOptionalEnv(import.meta.env.VITE_SENTRY_RELEASE),
    tracesSampleRate: readSampleRate(
      import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE,
      "VITE_SENTRY_TRACES_SAMPLE_RATE"
    ),
    replaysSessionSampleRate: readSampleRate(
      import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
      "VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE"
    ),
    replaysOnErrorSampleRate: readSampleRate(
      import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
      "VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE"
    ),
  }
}

function hasSentryDsn(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0
}

let sentryModule: SentryModule | null = null
let sentryLoadPromise: Promise<SentryModule> | null = null
let sentryReady = false
let lastUserContext: RedactedSentryUserContext | null = null
const pendingActions: Array<(module: SentryModule) => void> = []

function loadSentryModule(): Promise<SentryModule> {
  sentryLoadPromise ??= import("@sentry/react").then((module) => {
    sentryModule = module
    return module
  })
  return sentryLoadPromise
}

function toSentryUser(user: RedactedSentryUserContext) {
  return {
    id: user.id,
    role: user.role ?? undefined,
    access_enabled: user.accessEnabled ?? undefined,
  }
}

function runWhenReady(action: (module: SentryModule) => void) {
  if (sentryReady && sentryModule) {
    action(sentryModule)
    return
  }
  if (sentryLoadPromise && pendingActions.length < 25) {
    pendingActions.push(action)
  }
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

export async function initSentry() {
  const sentryEnv = readSentryEnv()
  if (!hasSentryDsn(sentryEnv.dsn)) {
    return
  }

  const SentrySdk = await loadSentryModule()

  SentrySdk.init({
    dsn: sentryEnv.dsn,
    environment: sentryEnv.appEnv,
    release: sentryEnv.release,
    integrations: [
      SentrySdk.browserTracingIntegration(),
      SentrySdk.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      SentrySdk.httpClientIntegration(),
      SentrySdk.globalHandlersIntegration(),
      SentrySdk.linkedErrorsIntegration(),
      SentrySdk.dedupeIntegration(),
    ],
    tracePropagationTargets: ["localhost"],
    tracesSampleRate: sentryEnv.tracesSampleRate,
    replaysSessionSampleRate: sentryEnv.replaysSessionSampleRate,
    replaysOnErrorSampleRate: sentryEnv.replaysOnErrorSampleRate,
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

  if (lastUserContext) {
    SentrySdk.setUser(toSentryUser(lastUserContext))
  }

  sentryReady = true
  for (const action of pendingActions.splice(0)) {
    action(SentrySdk)
  }
}

export function setSentryUserContext(user: RedactedSentryUserContext) {
  lastUserContext = user
  runWhenReady((module) => module.setUser(toSentryUser(user)))
}

export function clearSentryUserContext() {
  lastUserContext = null
  runWhenReady((module) => module.setUser(null))
}

export const Sentry = {
  captureException(error: unknown, captureContext?: CaptureContext) {
    runWhenReady((module) => module.captureException(error, captureContext))
  },
  withScope(callback: (scope: SentryScope) => void) {
    runWhenReady((module) => module.withScope(callback))
  },
}
