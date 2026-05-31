import { supabase } from "@/infrastructure/supabase/client"
import { getVapidPublicKey, urlBase64ToUint8Array } from "./vapid"

export type PushRegistrationResult =
  | { status: "subscribed"; subscriptionId: string }
  | { status: "denied" }
  | { status: "unsupported" }
  | { status: "no-vapid-key" }
  | { status: "error"; error: string }

/**
 * Register the push-only service worker and subscribe for web push notifications.
 * Idempotent — safe to call multiple times. Stores the subscription in push_subscriptions
 * via the register_push_subscription RPC.
 */
export async function registerWebPush(): Promise<PushRegistrationResult> {
  // Check browser support
  if (!("serviceWorker" in navigator) || !("PushManager" in globalThis)) {
    return { status: "unsupported" }
  }

  const vapidKey = getVapidPublicKey()
  if (!vapidKey) {
    return { status: "no-vapid-key" }
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register("/sw-push.js", {
      scope: "/",
    })

    // Request permission
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      return { status: "denied" }
    }

    // Subscribe to push
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
    }

    // Extract keys
    const rawKeys = subscription.toJSON()
    const endpoint = subscription.endpoint
    const p256dh = rawKeys.keys?.p256dh ?? ""
    const authKey = rawKeys.keys?.auth ?? ""

    // Store in database
    const { data, error } = await supabase.rpc("register_push_subscription", {
      p_platform: "web",
      p_endpoint: endpoint,
      p_p256dh: p256dh,
      p_auth_key: authKey,
    })

    if (error) {
      console.error("[push] registration RPC failed:", error.message)
      return { status: "error", error: error.message }
    }

    return { status: "subscribed", subscriptionId: data.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[push] registration failed:", message)
    return { status: "error", error: message }
  }
}

/**
 * Unregister the push subscription and remove it from the database.
 */
export async function unregisterWebPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration("/")
    if (!registration) return true

    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
    }

    return true
  } catch (err) {
    console.error("[push] unregister failed:", err)
    return false
  }
}
