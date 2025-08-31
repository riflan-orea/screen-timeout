"use client"

import { useEffect, useState } from "react"

export function useServiceWorker() {
  const [isSupported, setIsSupported] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      console.log("[SW] Service worker support detected")
      setIsSupported(true)

      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[SW] Service worker registered successfully:", registration)
          
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
                  setIsRegistered(true)
                }
              })
            } else if (registration.waiting) {
              console.log("[SW] Service worker is waiting")
              setIsRegistered(true)
            }
          }

          waitForServiceWorker()
          
          // Also listen for updates
          registration.addEventListener('updatefound', () => {
            console.log("[SW] Service worker update found")
            waitForServiceWorker()
          })
        })
        .catch((error) => {
          console.error("[SW] Service worker registration failed:", error)
          setIsRegistered(false)
        })
    } else {
      console.warn("[SW] Service worker not supported in this browser")
    }
  }, [])

  const scheduleNotification = (title: string, body: string, delay: number, id?: string) => {
    console.log("[SW] Attempting to schedule notification:", { title, body, delay, id, isRegistered, hasController: !!navigator.serviceWorker.controller })
    
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
        hasController: !!navigator.serviceWorker.controller
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
    console.log("[SW] Attempting to show notification via service worker:", { title, body, isRegistered, hasController: !!navigator.serviceWorker.controller })
    
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
        hasController: !!navigator.serviceWorker.controller
      })
    }
  }

  return {
    isSupported,
    isRegistered,
    scheduleNotification,
    cancelNotification,
    showNotificationViaServiceWorker,
  }
}
