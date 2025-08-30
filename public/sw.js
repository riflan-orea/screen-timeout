const CACHE_NAME = "timeout-reminder-v1"

self.addEventListener("install", (event) => {
  console.log("[SW] Service worker installing...")
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("[SW] Service worker activating...")
  event.waitUntil(self.clients.claim())
})

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SCHEDULE_NOTIFICATION") {
    const { title, body, delay } = event.data

    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "timeout-reminder",
        requireInteraction: true,
        actions: [
          {
            action: "dismiss",
            title: "Dismiss",
          },
        ],
      })
    }, delay)
  }
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  if (event.action === "dismiss") {
    return
  }

  // Focus or open the app
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus()
      }
      return self.clients.openWindow("/")
    }),
  )
})
