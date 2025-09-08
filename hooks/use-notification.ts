"use client"

import { useState, useEffect, useCallback } from "react"
import { useServiceWorker } from "./use-service-worker"

interface NotificationOptions {
  title: string
  body: string
  icon?: string
  tag?: string
  requireInteraction?: boolean
}

interface NotificationState {
  permission: NotificationPermission
  isSupported: boolean
  lastNotificationTime: number | null
}

export function useNotification() {
  const [state, setState] = useState<NotificationState>({
    permission: "default",
    isSupported: false,
    lastNotificationTime: null,
  })

  const { isSupported: swSupported, isRegistered: swRegistered, scheduleNotification } = useServiceWorker()

  // Debug function to check notification environment
  const debugNotificationEnvironment = useCallback(() => {
    if (typeof window === 'undefined') return
    
    const isMacOS = navigator.platform.includes('Mac')
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isChrome = /chrome/i.test(navigator.userAgent)
    
    console.log('=== Notification Debug Info ===')
    console.log('Platform:', navigator.platform)
    console.log('User Agent:', navigator.userAgent)
    console.log('Is macOS:', isMacOS)
    console.log('Is Safari:', isSafari)
    console.log('Is Chrome:', isChrome)
    console.log('Notification supported:', 'Notification' in window)
    console.log('Service Worker supported:', 'serviceWorker' in navigator)
    console.log('Current permission:', Notification.permission)
    console.log('SW registered:', swRegistered)
    console.log('================================')
  }, [swRegistered])

  // Initialize notification state
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const isSupported = "Notification" in window
    const permission = isSupported ? Notification.permission : "denied"

    // Load last notification time from localStorage
    const lastNotificationTime = localStorage.getItem("lastNotificationTime")

    setState({
      permission,
      isSupported,
      lastNotificationTime: lastNotificationTime ? Number.parseInt(lastNotificationTime) : null,
    })
  }, [])

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      console.warn("Notifications are not supported in this browser")
      return false
    }

    if (state.permission === "granted") {
      return true
    }

    try {
      // For macOS Safari, we need to handle permission requests more carefully
      const isMacOS = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')
      const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
      
      if (isMacOS && isSafari) {
        // Safari on macOS requires user interaction and may need a delay
        console.log("Requesting notification permission on macOS Safari...")
      }

      const permission = await Notification.requestPermission()
      setState((prev) => ({ ...prev, permission }))

      // Store permission state
      if (typeof window !== 'undefined') {
        localStorage.setItem("notificationPermission", permission)
      }

      // Log permission result for debugging
      console.log(`Notification permission result: ${permission}`)
      
      if (permission === "denied" && isMacOS) {
        console.warn("Notification permission denied on macOS. Please check System Settings > Notifications and ensure the browser is allowed to show notifications.")
      }

      return permission === "granted"
    } catch (error) {
      console.error("Error requesting notification permission:", error)
      return false
    }
  }, [state.isSupported, state.permission])

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (typeof window === 'undefined') return
    
    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Create a simple notification beep
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      console.warn("Could not play notification sound:", error)
    }
  }, [])

  // Trigger device vibration
  const triggerVibration = useCallback(() => {
    if ("vibrate" in navigator) {
      try {
        // Vibration pattern: vibrate for 200ms, pause 100ms, vibrate 200ms
        navigator.vibrate([200, 100, 200])
      } catch (error) {
        console.warn("Could not trigger vibration:", error)
      }
    }
  }, [])

  const showNotification = useCallback(
    async (options: NotificationOptions): Promise<boolean> => {
      if (!state.isSupported || state.permission !== "granted") {
        console.warn("Cannot show notification: not supported or permission denied")
        return false
      }

      try {
        // Detect macOS and Safari
        const isMacOS = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')
        const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
        
        // Get absolute icon URL for better compatibility
        const iconUrl = options.icon || (typeof window !== 'undefined' ? `${window.location.origin}/icon-192.png` : "/icon-192.png")
        
        // macOS/Safari specific notification options
        const notificationOptions = {
          body: options.body,
          icon: iconUrl,
          tag: options.tag || "timeout-reminder",
          requireInteraction: isMacOS ? false : (options.requireInteraction || true), // macOS works better with false
          silent: false,
          // Add macOS specific options
          ...(isMacOS && {
            badge: iconUrl,
            timestamp: Date.now(),
            renotify: true, // Important for macOS to show repeated notifications
          }),
        }

        let notification: Notification

        // Use service worker registration for better macOS compatibility when available
        if (swSupported && swRegistered && 'serviceWorker' in navigator && navigator.serviceWorker.ready) {
          try {
            const registration = await navigator.serviceWorker.ready
            await registration.showNotification(options.title, notificationOptions)
            
            // For service worker notifications, we need to handle click events differently
            navigator.serviceWorker.addEventListener('message', (event) => {
              if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
                if (typeof window !== 'undefined') {
                  window.focus()
                }
              }
            })
          } catch (swError) {
            console.warn("Service worker notification failed, falling back to direct API:", swError)
            // Fallback to direct notification API
            notification = new Notification(options.title, notificationOptions)
            
            notification.onclick = () => {
              if (typeof window !== 'undefined') {
                window.focus()
              }
              notification.close()
            }

            // macOS notifications should auto-close after a reasonable time
            setTimeout(() => {
              notification.close()
            }, isMacOS ? 8000 : 10000)
          }
        } else {
          // Direct notification API
          notification = new Notification(options.title, notificationOptions)
          
          notification.onclick = () => {
            if (typeof window !== 'undefined') {
              window.focus()
            }
            notification.close()
          }

          notification.onerror = (error) => {
            console.error("Notification error:", error)
          }

          notification.onshow = () => {
            console.log("Notification shown successfully")
          }

          // macOS notifications should auto-close after a reasonable time
          setTimeout(() => {
            if (notification) {
              notification.close()
            }
          }, isMacOS ? 8000 : 10000)
        }

        // Play sound and trigger vibration
        playNotificationSound()
        triggerVibration()

        // Store notification time
        const now = Date.now()
        if (typeof window !== 'undefined') {
          localStorage.setItem("lastNotificationTime", now.toString())
        }
        setState((prev) => ({ ...prev, lastNotificationTime: now }))

        return true
      } catch (error) {
        console.error("Error showing notification:", error)
        return false
      }
    },
    [state.isSupported, state.permission, playNotificationSound, triggerVibration, swSupported, swRegistered],
  )

  const scheduleTimeoutReminder = useCallback(
    (delayMs: number, message?: string): boolean => {
      if (!swSupported || !swRegistered || state.permission !== "granted") {
        return false
      }

      scheduleNotification("Timeout Reminder", message || "Time for a break! You've been working for a while.", delayMs)

      return true
    },
    [swSupported, swRegistered, state.permission, scheduleNotification],
  )

  // Show timeout reminder notification
  const showTimeoutReminder = useCallback(
    async (message?: string): Promise<boolean> => {
      const result = await showNotification({
        title: "Timeout Reminder",
        body: message || "Time for a break! You've been working for a while.",
        tag: "timeout-reminder",
        requireInteraction: true,
      })
      return result
    },
    [showNotification],
  )

  // Test notification function for debugging
  const testNotification = useCallback(async (): Promise<boolean> => {
    console.log("Testing notification...")
    debugNotificationEnvironment()
    
    return await showNotification({
      title: "🔔 Test Notification",
      body: "This is a test notification to verify macOS compatibility. If you see this, notifications are working!",
      tag: "test-notification",
      requireInteraction: false,
    })
  }, [showNotification, debugNotificationEnvironment])

  const isEnabled = state.isSupported && state.permission === "granted"
  const hasBackgroundSupport = swSupported && swRegistered

  return {
    isSupported: state.isSupported,
    permission: state.permission,
    isEnabled,
    hasBackgroundSupport, // Added background support indicator
    lastNotificationTime: state.lastNotificationTime,
    requestPermission,
    showNotification,
    showTimeoutReminder,
    scheduleTimeoutReminder, // Added scheduled notification method
    playNotificationSound,
    triggerVibration,
    testNotification, // Added test function for debugging
    debugNotificationEnvironment, // Added debug function
  }
}
