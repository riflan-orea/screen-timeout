const CACHE_NAME = "timeout-reminder-v2"
const STATIC_CACHE_NAME = "timeout-reminder-static-v2"
const DYNAMIC_CACHE_NAME = "timeout-reminder-dynamic-v2"

// Assets to cache on install
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-192.svg", 
  "/icon-512.svg",
  "/favicon.svg",
  "/favicon.ico"
]

self.addEventListener("install", (event) => {
  console.log("[SW] Service worker installing...")
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log("[SW] Caching static assets")
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  console.log("[SW] Service worker activating...")
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log("[SW] Deleting old cache:", cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  )
})

// Add fetch event for caching strategy
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return
  
  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith("http")) return

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) {
          return response
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== "basic") {
              return response
            }
            
            // Clone the response
            const responseToCache = response.clone()
            
            // Cache dynamic content
            caches.open(DYNAMIC_CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache)
              })
            
            return response
          })
      })
      .catch(() => {
        // Fallback for offline
        if (event.request.destination === "document") {
          return caches.match("/")
        }
      })
  )
})

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SCHEDULE_NOTIFICATION") {
    const { title, body, delay } = event.data

    setTimeout(() => {
      // Enhanced notification options for better macOS compatibility
      const notificationOptions = {
        body,
        icon: "/icon-192.png", // Use PNG instead of ICO for better compatibility
        badge: "/icon-192.png",
        tag: "timeout-reminder",
        requireInteraction: false, // macOS works better with false
        silent: false,
        timestamp: Date.now(),
        renotify: true, // Important for macOS to show repeated notifications
        actions: [
          {
            action: "dismiss",
            title: "Dismiss",
          },
        ],
        // Add platform-specific data
        data: {
          url: "/",
          timestamp: Date.now()
        }
      }

      self.registration.showNotification(title, notificationOptions)
        .then(() => {
          console.log("[SW] Notification shown successfully")
        })
        .catch((error) => {
          console.error("[SW] Failed to show notification:", error)
        })
    }, delay)
  }
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  if (event.action === "dismiss") {
    return
  }

  // Send message to all clients about notification click
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'NOTIFICATION_CLICK',
        timestamp: Date.now()
      })
    })
  })

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
