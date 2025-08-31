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

// Store scheduled notifications
let scheduledNotifications = new Map()

self.addEventListener("message", (event) => {
  console.log("[SW] Received message:", event.data)
  
  if (event.data && event.data.type === "SCHEDULE_NOTIFICATION") {
    const { title, body, delay, id } = event.data
    console.log("[SW] Scheduling notification:", { title, body, delay, id })
    
    // Clear existing notification with same id
    if (id && scheduledNotifications.has(id)) {
      clearTimeout(scheduledNotifications.get(id))
      console.log("[SW] Cleared existing notification:", id)
    }
    
    const timeoutId = setTimeout(() => {
      console.log("[SW] Showing scheduled notification:", { title, body })
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
      }).then(() => {
        console.log("[SW] Notification shown successfully")
      }).catch(error => {
        console.error("[SW] Error showing notification:", error)
      })
      
      // Clean up
      if (id) {
        scheduledNotifications.delete(id)
      }
    }, delay)
    
    // Store the timeout id
    if (id) {
      scheduledNotifications.set(id, timeoutId)
      console.log("[SW] Notification scheduled with ID:", id)
    }
  }
  
  if (event.data && event.data.type === "CANCEL_NOTIFICATION") {
    const { id } = event.data
    console.log("[SW] Canceling notification:", id)
    if (id && scheduledNotifications.has(id)) {
      clearTimeout(scheduledNotifications.get(id))
      scheduledNotifications.delete(id)
      console.log("[SW] Notification canceled:", id)
    }
  }
  
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, body } = event.data
    console.log("[SW] Showing immediate notification:", { title, body })
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
    }).then(() => {
      console.log("[SW] Immediate notification shown successfully")
    }).catch(error => {
      console.error("[SW] Error showing immediate notification:", error)
    })
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
