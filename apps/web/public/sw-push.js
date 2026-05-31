// Push-only service worker — no caching to avoid conflicts with Vite HMR.
// Receives push events from the server and shows notifications.

self.addEventListener("push", (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: "Family Events", body: event.data.text() }
  }

  const { title = "Family Events", body = "", url, icon } = payload

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon || "/brand/icon-192.png",
      badge: "/brand/icon-192.png",
      data: { url: url || "/" },
      tag: payload.tag || undefined,
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const url = event.notification.data?.url || "/"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if one is open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(url)
    })
  )
})
