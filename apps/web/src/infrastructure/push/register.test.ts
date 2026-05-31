import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock VAPID module
const mockGetVapidPublicKey = vi.fn()
const mockUrlBase64ToUint8Array = vi.fn()

vi.mock("./vapid", () => ({
  getVapidPublicKey: () => mockGetVapidPublicKey(),
  urlBase64ToUint8Array: (s: string) => mockUrlBase64ToUint8Array(s),
}))

// Mock Supabase
const mockRpc = vi.fn()
vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

// Helper to set up browser globals that exist in node environment
function setupBrowserGlobals(options?: { hasServiceWorker?: boolean; hasPushManager?: boolean }) {
  const { hasServiceWorker = true, hasPushManager = true } = options ?? {}

  if (hasServiceWorker) {
    Object.defineProperty(globalThis.navigator, "serviceWorker", {
      value: {},
      configurable: true,
      writable: true,
    })
  } else {
    Object.defineProperty(globalThis.navigator, "serviceWorker", {
      value: undefined,
      configurable: true,
      writable: true,
    })
  }

  if (hasPushManager) {
    ;(globalThis as Record<string, unknown>).PushManager = class {}
  } else {
    delete (globalThis as Record<string, unknown>).PushManager
  }
}

function setServiceWorker(value: unknown) {
  Object.defineProperty(globalThis.navigator, "serviceWorker", {
    value,
    configurable: true,
    writable: true,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  // Clean up globals
  delete (globalThis as Record<string, unknown>).PushManager
  delete (globalThis as Record<string, unknown>).Notification
  try {
    Object.defineProperty(globalThis.navigator, "serviceWorker", {
      value: undefined,
      configurable: true,
      writable: true,
    })
  } catch {
    // navigator may not have serviceWorker property at all
  }
})

async function loadModule() {
  // Dynamic import to get fresh module after mock setup
  vi.resetModules()
  return import("./register")
}

describe("registerWebPush", () => {
  it("returns unsupported when serviceWorker is not available", async () => {
    setupBrowserGlobals({ hasServiceWorker: false, hasPushManager: false })

    const { registerWebPush } = await loadModule()
    const result = await registerWebPush()
    expect(result).toEqual({ status: "unsupported" })
  })

  it("returns no-vapid-key when VAPID key is not configured", async () => {
    setupBrowserGlobals()
    mockGetVapidPublicKey.mockReturnValue(null)

    const { registerWebPush } = await loadModule()
    const result = await registerWebPush()
    expect(result).toEqual({ status: "no-vapid-key" })
  })

  it("returns denied when notification permission is denied", async () => {
    setupBrowserGlobals()

    const mockSubscription = {
      endpoint: "https://push.example.com/sub/123",
      toJSON: () => ({ keys: { p256dh: "key1", auth: "key2" } }),
    }

    setServiceWorker({
      register: vi.fn().mockResolvedValue({
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(null),
          subscribe: vi.fn().mockResolvedValue(mockSubscription),
        },
      }),
    })

    mockGetVapidPublicKey.mockReturnValue("fake-vapid-key")
    mockUrlBase64ToUint8Array.mockReturnValue(new Uint8Array([1, 2, 3]))

    ;(globalThis as Record<string, unknown>).Notification = {
      requestPermission: vi.fn().mockResolvedValue("denied"),
    }

    const { registerWebPush } = await loadModule()
    const result = await registerWebPush()
    expect(result).toEqual({ status: "denied" })
  })

  it("returns subscribed with ID on successful registration", async () => {
    setupBrowserGlobals()

    const mockSubscription = {
      endpoint: "https://push.example.com/sub/123",
      toJSON: () => ({ keys: { p256dh: "p256dh-key", auth: "auth-key" } }),
    }

    setServiceWorker({
      register: vi.fn().mockResolvedValue({
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(null),
          subscribe: vi.fn().mockResolvedValue(mockSubscription),
        },
      }),
    })

    mockGetVapidPublicKey.mockReturnValue("fake-vapid-key")
    mockUrlBase64ToUint8Array.mockReturnValue(new Uint8Array([1, 2, 3]))

    ;(globalThis as Record<string, unknown>).Notification = {
      requestPermission: vi.fn().mockResolvedValue("granted"),
    }

    mockRpc.mockResolvedValue({
      data: { id: "sub-uuid-123" },
      error: null,
    })

    const { registerWebPush } = await loadModule()
    const result = await registerWebPush()

    expect(result).toEqual({ status: "subscribed", subscriptionId: "sub-uuid-123" })
    expect(mockRpc).toHaveBeenCalledWith("register_push_subscription", {
      p_platform: "web",
      p_endpoint: "https://push.example.com/sub/123",
      p_p256dh: "p256dh-key",
      p_auth_key: "auth-key",
    })
  })

  it("returns error when RPC fails", async () => {
    setupBrowserGlobals()

    const mockSubscription = {
      endpoint: "https://push.example.com/sub/123",
      toJSON: () => ({ keys: { p256dh: "p256dh-key", auth: "auth-key" } }),
    }

    setServiceWorker({
      register: vi.fn().mockResolvedValue({
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(null),
          subscribe: vi.fn().mockResolvedValue(mockSubscription),
        },
      }),
    })

    mockGetVapidPublicKey.mockReturnValue("fake-vapid-key")
    mockUrlBase64ToUint8Array.mockReturnValue(new Uint8Array([1, 2, 3]))

    ;(globalThis as Record<string, unknown>).Notification = {
      requestPermission: vi.fn().mockResolvedValue("granted"),
    }

    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Database error" },
    })

    const { registerWebPush } = await loadModule()
    const result = await registerWebPush()

    expect(result).toEqual({ status: "error", error: "Database error" })
  })
})

describe("unregisterWebPush", () => {
  it("returns true when no service worker registration exists", async () => {
    setServiceWorker({
      getRegistration: vi.fn().mockResolvedValue(undefined),
    })

    const { unregisterWebPush } = await loadModule()
    const result = await unregisterWebPush()
    expect(result).toBe(true)
  })

  it("unsubscribes and returns true when subscription exists", async () => {
    const mockUnsubscribe = vi.fn().mockResolvedValue(true)

    setServiceWorker({
      getRegistration: vi.fn().mockResolvedValue({
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue({
            unsubscribe: mockUnsubscribe,
          }),
        },
      }),
    })

    const { unregisterWebPush } = await loadModule()
    const result = await unregisterWebPush()
    expect(result).toBe(true)
    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})
