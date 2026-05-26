import { afterEach, describe, expect, it, vi } from "vitest"

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  setUser: vi.fn(),
  browserTracingIntegration: vi.fn(() => "browserTracing"),
  replayIntegration: vi.fn(() => "replay"),
  httpClientIntegration: vi.fn(() => "httpClient"),
  globalHandlersIntegration: vi.fn(() => "globalHandlers"),
  linkedErrorsIntegration: vi.fn(() => "linkedErrors"),
  dedupeIntegration: vi.fn(() => "dedupe"),
  consoleLoggingIntegration: vi.fn(() => "consoleLogging"),
}))

vi.mock("@sentry/react", () => sentry)

async function loadSentry() {
  vi.resetModules()
  return import("./sentry")
}

describe("sentry", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it("does not initialize without an explicit DSN", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "")

    const { initSentry } = await loadSentry()

    await initSentry()

    expect(sentry.init).not.toHaveBeenCalled()
    expect(sentry.consoleLoggingIntegration).not.toHaveBeenCalled()
  })

  it("uses privacy-safe default options when a DSN is configured", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://public@example.com/1")
    vi.stubEnv("VITE_SENTRY_TRACES_SAMPLE_RATE", "")
    vi.stubEnv("VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE", "")
    vi.stubEnv("VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE", "")

    const { initSentry } = await loadSentry()

    await initSentry()

    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://public@example.com/1",
        tracesSampleRate: 0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        sendDefaultPii: false,
        enableLogs: false,
      })
    )
    expect(sentry.consoleLoggingIntegration).not.toHaveBeenCalled()
  })

  it("keeps sample-rate overrides", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://public@example.com/1")
    vi.stubEnv("VITE_SENTRY_TRACES_SAMPLE_RATE", "0.2")
    vi.stubEnv("VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE", "0.3")
    vi.stubEnv("VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE", "0.4")

    const { initSentry } = await loadSentry()

    await initSentry()

    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        tracesSampleRate: 0.2,
        replaysSessionSampleRate: 0.3,
        replaysOnErrorSampleRate: 0.4,
      })
    )
  })

  it("sets and clears redacted user context", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://public@example.com/1")
    const { clearSentryUserContext, initSentry, setSentryUserContext } = await loadSentry()

    setSentryUserContext({
      id: "user-1",
      role: "admin",
      accessEnabled: true,
    })
    await initSentry()
    clearSentryUserContext()

    expect(sentry.setUser).toHaveBeenNthCalledWith(1, {
      id: "user-1",
      role: "admin",
      access_enabled: true,
    })
    expect(sentry.setUser).toHaveBeenNthCalledWith(2, null)
  })
})
