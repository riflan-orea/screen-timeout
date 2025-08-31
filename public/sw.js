const CACHE_NAME = "timeout-reminder-v5"
const STATIC_CACHE_NAME = "timeout-reminder-static-v5"
const DYNAMIC_CACHE_NAME = "timeout-reminder-dynamic-v5"

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
      .then(() => {
        console.log("[SW] Skip waiting to activate immediately")
        return self.skipWaiting()
      })
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
      // Take control of all clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log("[SW] Service worker activated and claimed clients")
      // Start background notification checker
      startBackgroundNotificationChecker()
    })
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
let backgroundNotificationChecker = null

// Start background notification checker
function startBackgroundNotificationChecker() {
  if (backgroundNotificationChecker) {
    clearInterval(backgroundNotificationChecker)
  }
  
  // Check for notifications every 30 seconds
  backgroundNotificationChecker = setInterval(() => {
    checkAndShowScheduledNotifications()
  }, 30000)
  
  console.log("[SW] Background notification checker started")
}

// Check and show scheduled notifications
async function checkAndShowScheduledNotifications() {
  try {
    // Get scheduled notification data from IndexedDB
    const notificationData = await getScheduledNotificationData()
    
    if (notificationData && notificationData.scheduledTime) {
      const now = Date.now()
      const timeUntilNotification = notificationData.scheduledTime - now
      
      // If it's time to show the notification (within 30 seconds)
      if (timeUntilNotification <= 30000 && timeUntilNotification > -30000) {
        console.log("[SW] Time to show background notification:", notificationData)
        
        // Show the notification
        await showNotificationWithOptions(notificationData.title, notificationData.body)
        
        // Schedule next notification if it's a recurring one
        if (notificationData.interval) {
          const nextNotificationData = {
            ...notificationData,
            scheduledTime: now + notificationData.interval,
            id: `timeout-reminder-${Date.now()}`
          }
          
          await storeScheduledNotificationData(nextNotificationData)
          console.log("[SW] Next notification scheduled for:", new Date(nextNotificationData.scheduledTime))
        } else {
          // Clear the notification data if it's not recurring
          await clearScheduledNotificationData()
        }
      }
    }
  } catch (error) {
    console.error("[SW] Error checking scheduled notifications:", error)
  }
}

// Store notification data using IndexedDB for better persistence
async function storeScheduledNotificationData(data) {
  try {
    // Use IndexedDB for persistent storage
    const db = await openNotificationDB()
    const transaction = db.transaction(['notifications'], 'readwrite')
    const store = transaction.objectStore('notifications')
    
    await store.put({
      id: 'current-notification',
      ...data,
      storedAt: Date.now()
    })
    
    console.log("[SW] Notification data stored in IndexedDB:", data)
  } catch (error) {
    console.error("[SW] Error storing notification data:", error)
    // Fallback to localStorage if IndexedDB fails
    try {
      localStorage.setItem('timeout-reminder-scheduled-notification', JSON.stringify({
        ...data,
        storedAt: Date.now()
      }))
      console.log("[SW] Notification data stored in localStorage (fallback)")
    } catch (localStorageError) {
      console.error("[SW] Error storing in localStorage:", localStorageError)
    }
  }
}

// Get stored notification data
async function getScheduledNotificationData() {
  try {
    // Try IndexedDB first
    const db = await openNotificationDB()
    const transaction = db.transaction(['notifications'], 'readonly')
    const store = transaction.objectStore('notifications')
    const result = await store.get('current-notification')
    
    if (result) {
      return result
    }
  } catch (error) {
    console.warn("[SW] IndexedDB not available, trying localStorage:", error)
  }
  
  // Fallback to localStorage
  try {
    const stored = localStorage.getItem('timeout-reminder-scheduled-notification')
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    console.error("[SW] Error getting notification data from localStorage:", error)
    return null
  }
}

// Clear stored notification data
async function clearScheduledNotificationData() {
  try {
    // Clear from IndexedDB
    const db = await openNotificationDB()
    const transaction = db.transaction(['notifications'], 'readwrite')
    const store = transaction.objectStore('notifications')
    await store.delete('current-notification')
    console.log("[SW] Notification data cleared from IndexedDB")
  } catch (error) {
    console.warn("[SW] Could not clear from IndexedDB:", error)
  }
  
  // Clear from localStorage as well
  try {
    localStorage.removeItem('timeout-reminder-scheduled-notification')
    console.log("[SW] Notification data cleared from localStorage")
  } catch (error) {
    console.error("[SW] Error clearing from localStorage:", error)
  }
}

// Open IndexedDB for notification storage
function openNotificationDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TimeoutReminderDB', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications', { keyPath: 'id' })
      }
    }
  })
}

// Helper function to show notification with Android-specific options
const showNotificationWithOptions = async (title, body, options = {}) => {
  try {
    // Check if we have permission
    if (Notification.permission !== 'granted') {
      console.error("[SW] Notification permission not granted")
      return false
    }

    // Android-specific notification options
    const notificationOptions = {
      body,
      icon: "/icon-192.png", // Use PNG for better Android support
      badge: "/icon-192.png",
      tag: "timeout-reminder",
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200], // Vibration pattern for Android
      actions: [
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ],
      data: {
        url: "/", // URL to open when notification is clicked
        timestamp: Date.now()
      },
      ...options
    }

    console.log("[SW] Showing notification with options:", notificationOptions)
    
    const notification = await self.registration.showNotification(title, notificationOptions)
    console.log("[SW] Notification shown successfully:", notification)
    return true
  } catch (error) {
    console.error("[SW] Error showing notification:", error)
    return false
  }
}

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
    
    const timeoutId = setTimeout(async () => {
      console.log("[SW] Showing scheduled notification:", { title, body })
      await showNotificationWithOptions(title, body)
      
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
  
  if (event.data && event.data.type === "SCHEDULE_BACKGROUND_NOTIFICATION") {
    const { title, body, scheduledTime, interval, id } = event.data
    console.log("[SW] Scheduling background notification:", { title, body, scheduledTime, interval, id })
    
    // Store the notification data for background processing
    storeScheduledNotificationData({
      title,
      body,
      scheduledTime,
      interval,
      id
    })
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
  
  if (event.data && event.data.type === "CANCEL_ALL_NOTIFICATIONS") {
    console.log("[SW] Canceling all notifications")
    
    // Clear all scheduled timeouts
    scheduledNotifications.forEach(timeoutId => {
      clearTimeout(timeoutId)
    })
    scheduledNotifications.clear()
    
    // Clear stored notification data
    clearScheduledNotificationData()
    
    console.log("[SW] All notifications canceled")
  }
  
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, body } = event.data
    console.log("[SW] Showing immediate notification:", { title, body })
    showNotificationWithOptions(title, body)
  }
})

self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event)
  event.notification.close()

  if (event.action === "dismiss") {
    console.log("[SW] Notification dismissed")
    return
  }
  


  // Focus or open the app
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      console.log("[SW] Found clients:", clients.length)
      if (clients.length > 0) {
        console.log("[SW] Focusing existing client")
        return clients[0].focus()
      }
      console.log("[SW] Opening new window")
      return self.clients.openWindow("/")
    }).catch(error => {
      console.error("[SW] Error handling notification click:", error)
    }),
  )
})

// Handle notification close
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification closed:", event)
})

// Handle push events (for future use)
self.addEventListener("push", (event) => {
  console.log("[SW] Push event received:", event)
  
  if (event.data) {
    try {
      const data = event.data.json()
      console.log("[SW] Push data:", data)
      
      if (data.title && data.body) {
        showNotificationWithOptions(data.title, data.body, data.options)
      }
    } catch (error) {
      console.error("[SW] Error parsing push data:", error)
    }
  }
})

// Handle background sync (for better reliability)
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync event:", event.tag)
  
  if (event.tag === "timeout-reminder-sync") {
    event.waitUntil(
      checkAndShowScheduledNotifications()
    )
  }
})

// Handle periodic background sync (for better reliability on supported browsers)
self.addEventListener("periodicsync", (event) => {
  console.log("[SW] Periodic background sync event:", event.tag)
  
  if (event.tag === "timeout-reminder-periodic") {
    event.waitUntil(
      checkAndShowScheduledNotifications()
    )
  }
})
