/**
 * VAPID public key for web push subscriptions.
 * Set via VITE_VAPID_PUBLIC_KEY environment variable.
 */
export function getVapidPublicKey(): string | null {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!key || typeof key !== "string" || key.length === 0) {
    return null
  }
  return key
}

/**
 * Convert a base64url-encoded VAPID key to a Uint8Array for PushManager.subscribe().
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const outputArray = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
