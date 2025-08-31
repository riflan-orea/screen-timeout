"use client"

import { useEffect, useState } from "react"

export function useServiceWorker() {
  const [isSupported, setIsSupported] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      console.log("[SW] Service worker support detected")
      setIsSupported(true)
      
      // Detect Android
      const android = /Android/i.test(navigator.userAgent)
      setIsAndroid(android)
      console.log("[SW] Android device detected:", android)

      // Register service worker with better error handling
      const registerServiceWorker = async () => {
        try {
          console.log("[SW] Registering service worker...")
          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
            updateViaCache: "none" // Ensure fresh updates
          })
          
          console.log("[SW] Service worker registered successfully:", registration)
          
          // Register for background sync if supported
          if ('sync' in registration) {
            try {
              await (registration as any).sync.register('timeout-reminder-sync')
              console.log("[SW] Background sync registered")
            } catch (error) {
              console.warn("[SW] Background sync not supported:", error)
            }
          }
          
          // Register for periodic background sync if supported
          if ('periodicSync' in registration) {
            try {
              const status = await navigator.permissions.query({
                name: 'periodic-background-sync' as any
              })
              
              if (status.state === 'granted') {
                await (registration as any).periodicSync.register('timeout-reminder-periodic', {
                  minInterval: 30000 // 30 seconds minimum
                })
                console.log("[SW] Periodic background sync registered")
              } else {
                console.warn("[SW] Periodic background sync permission not granted")
              }
            } catch (error) {
              console.warn("[SW] Periodic background sync not supported:", error)
            }
          }
          
          // Wait for service worker to be ready
          const waitForServiceWorker = () => {
            if (registration.active) {
              console.log("[SW] Service worker is active and ready")
              setIsRegistered(true)
            } else if (registration.installing) {
              console.log("[SW] Service worker is installing...")
              registration.installing.addEventListener('statechange', () => {
                if (registration.installing?.state === 'installed') {
                  console.log("[SW] Service worker installed")
                  // For Android, we might need to wait a bit longer
                  if (android) {
                    setTimeout(() => setIsRegistered(true), 1000)
                  } else {
                    setIsRegistered(true)
                  }
                }
              })
            } else if (registration.waiting) {
              console.log("[SW] Service worker is waiting")
              // For Android, we might need to wait a bit longer
              if (android) {
                setTimeout(() => setIsRegistered(true), 1000)
              } else {
                setIsRegistered(true)
              }
            }
          }

          waitForServiceWorker()
          
          // Also listen for updates
          registration.addEventListener('updatefound', () => {
            console.log("[SW] Service worker update found")
            waitForServiceWorker()
          })

          // Handle controller change
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log("[SW] Service worker controller changed")
            setIsRegistered(true)
          })

        } catch (error) {
          console.error("[SW] Service worker registration failed:", error)
          setIsRegistered(false)
        }
      }

      registerServiceWorker()
    } else {
      console.warn("[SW] Service worker not supported in this browser")
    }
  }, [])

  const scheduleNotification = (title: string, body: string, delay: number, id?: string) => {
    console.log("[SW] Attempting to schedule notification:", { title, body, delay, id, isRegistered, hasController: !!navigator.serviceWorker.controller, isAndroid })
    
    if (isRegistered) {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "SCHEDULE_NOTIFICATION",
          title,
          body,
          delay,
          id: id || 'default',
        })
        console.log("[SW] Notification scheduled successfully")
      } else {
        // Wait for controller to be ready
        navigator.serviceWorker.ready.then((registration) => {
          if (registration.active) {
            registration.active.postMessage({
              type: "SCHEDULE_NOTIFICATION",
              title,
              body,
              delay,
              id: id || 'default',
            })
            console.log("[SW] Notification scheduled via active service worker")
          }
        }).catch(error => {
          console.error("[SW] Error waiting for service worker to schedule:", error)
        })
      }
    } else {
      console.warn("[SW] Cannot schedule notification: service worker not ready", {
        isRegistered,
        hasController: !!navigator.serviceWorker.controller,
        isAndroid
      })
    }
  }

  const cancelNotification = (id: string) => {
    if (isRegistered && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "CANCEL_NOTIFICATION",
        id,
      })
    }
  }

  const showNotificationViaServiceWorker = (title: string, body: string) => {
    console.log("[SW] Attempting to show notification via service worker:", { title, body, isRegistered, hasController: !!navigator.serviceWorker.controller, isAndroid })
    
    if (isRegistered) {
      // Wait for controller to be available if needed
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "SHOW_NOTIFICATION",
          title,
          body,
        })
        console.log("[SW] Notification message sent to service worker")
      } else {
        // Wait for controller to be ready
        navigator.serviceWorker.ready.then((registration) => {
          if (registration.active) {
            registration.active.postMessage({
              type: "SHOW_NOTIFICATION",
              title,
              body,
            })
            console.log("[SW] Notification message sent to active service worker")
          }
        }).catch(error => {
          console.error("[SW] Error waiting for service worker:", error)
        })
      }
    } else {
      console.warn("[SW] Cannot show notification: service worker not ready", {
        isRegistered,
        hasController: !!navigator.serviceWorker.controller,
        isAndroid
      })
    }
  }

  return {
    isSupported,
    isRegistered,
    isAndroid,
    scheduleNotification,
    cancelNotification,
    showNotificationViaServiceWorker,
  }
}
