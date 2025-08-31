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
  isAndroid: boolean
}

export function useNotification() {
  const [state, setState] = useState<NotificationState>({
    permission: "default",
    isSupported: false,
    lastNotificationTime: null,
    isAndroid: false,
  })

  const { isSupported: swSupported, isRegistered: swRegistered, scheduleNotification, cancelNotification, showNotificationViaServiceWorker } = useServiceWorker()

  // Initialize notification state
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const isSupported = "Notification" in window
    const isAndroid = /Android/i.test(navigator.userAgent)
    
    // Check saved permission first, then current permission
    const savedPermission = localStorage.getItem("notificationPermission") as NotificationPermission
    const currentPermission = isSupported ? Notification.permission : "denied"
    
    // Use current permission if it exists, otherwise use saved
    const permission = currentPermission !== "default" ? currentPermission : (savedPermission || currentPermission)

    // Load last notification time from localStorage
    const lastNotificationTime = localStorage.getItem("lastNotificationTime")

    setState({
      permission,
      isSupported,
      lastNotificationTime: lastNotificationTime ? Number.parseInt(lastNotificationTime) : null,
      isAndroid,
    })

    // Update localStorage if permission has changed
    if (permission !== savedPermission) {
      localStorage.setItem("notificationPermission", permission)
    }

    console.log("[Notification] Initialized with:", {
      isSupported,
      permission,
      isAndroid,
      swSupported,
      swRegistered: false // Will be updated by service worker hook
    })
  }, [])

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      console.warn("[Notification] Notifications are not supported in this browser")
      return false
    }

    if (state.permission === "granted") {
      console.log("[Notification] Permission already granted")
      return true
    }

    try {
      console.log("[Notification] Requesting permission...")
      
      // For Android, we might need to handle this differently
      if (state.isAndroid) {
        console.log("[Notification] Android device detected, using special handling")
      }
      
      const permission = await Notification.requestPermission()
      console.log("[Notification] Permission result:", permission)
      
      setState((prev) => ({ ...prev, permission }))

      // Store permission state
      if (typeof window !== 'undefined') {
        localStorage.setItem("notificationPermission", permission)
      }

      return permission === "granted"
    } catch (error) {
      console.error("[Notification] Error requesting notification permission:", error)
      return false
    }
  }, [state.isSupported, state.permission, state.isAndroid])

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
      console.log("[Notification] Attempting to show notification:", {
        isSupported: state.isSupported,
        permission: state.permission,
        isAndroid: state.isAndroid,
        swSupported,
        swRegistered,
        options
      })

      if (!state.isSupported || state.permission !== "granted") {
        console.warn("[Notification] Cannot show notification: not supported or permission denied", {
          isSupported: state.isSupported,
          permission: state.permission
        })
        return false
      }

      try {
        // For Android, prefer service worker notifications
        if (swSupported && swRegistered && navigator.serviceWorker.controller) {
          console.log("[Notification] Using service worker notification (preferred for Android)")
          // Use service worker for better background support
          showNotificationViaServiceWorker(options.title, options.body)
        } else if (swSupported && swRegistered) {
          console.log("[Notification] Service worker registered but no controller, waiting...")
          // Wait for controller to be ready
          try {
            const registration = await navigator.serviceWorker.ready
            if (registration.active) {
              registration.active.postMessage({
                type: "SHOW_NOTIFICATION",
                title: options.title,
                body: options.body,
              })
              console.log("[Notification] Notification sent via active service worker")
            } else {
              throw new Error("No active service worker")
            }
          } catch (error) {
            console.warn("[Notification] Service worker not ready, falling back to direct notification:", error)
            // Fallback to direct notification
            await showDirectNotification(options)
          }
        } else {
          console.log("[Notification] Using direct notification API (fallback)")
          // Fallback to regular notification
          await showDirectNotification(options)
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

        console.log("[Notification] Notification displayed successfully")
        return true
      } catch (error) {
        console.error("[Notification] Error showing notification:", error)
        return false
      }
    },
    [state.isSupported, state.permission, state.isAndroid, playNotificationSound, triggerVibration, swSupported, swRegistered, showNotificationViaServiceWorker],
  )

  // Helper function for direct notifications
  const showDirectNotification = async (options: NotificationOptions): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || (state.isAndroid ? "/icon-192.png" : "/favicon.ico"),
          tag: options.tag || "timeout-reminder",
          requireInteraction: options.requireInteraction || true,
          silent: false,
          vibrate: state.isAndroid ? [200, 100, 200] : undefined,
        })

        notification.onclick = () => {
          console.log("[Notification] Notification clicked")
          if (typeof window !== 'undefined') {
            window.focus()
          }
          notification.close()
        }

        notification.onerror = (error) => {
          console.error("[Notification] Notification error:", error)
          reject(error)
        }

        notification.onshow = () => {
          console.log("[Notification] Direct notification shown")
          resolve()
        }

        setTimeout(() => {
          notification.close()
        }, 10000)
      } catch (error) {
        reject(error)
      }
    })
  }

  const scheduleTimeoutReminder = useCallback(
    (delayMs: number, message?: string, id?: string): boolean => {
      if (!swSupported || !swRegistered || state.permission !== "granted") {
        console.warn("Cannot schedule notification: service worker not ready or permission denied")
        return false
      }

      scheduleNotification("Timeout Reminder", message || "Time for a break! You've been working for a while.", delayMs, id)

      return true
    },
    [swSupported, swRegistered, state.permission, scheduleNotification],
  )

  const cancelTimeoutReminder = useCallback(
    (id: string): void => {
      if (swSupported && swRegistered) {
        cancelNotification(id)
      }
    },
    [swSupported, swRegistered, cancelNotification],
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

  const isEnabled = state.isSupported && state.permission === "granted"
  const hasBackgroundSupport = swSupported && swRegistered

  return {
    isSupported: state.isSupported,
    permission: state.permission,
    isEnabled,
    hasBackgroundSupport, // Added background support indicator
    lastNotificationTime: state.lastNotificationTime,
    isAndroid: state.isAndroid,
    requestPermission,
    showNotification,
    showTimeoutReminder,
    scheduleTimeoutReminder, // Added scheduled notification method
    cancelTimeoutReminder, // Added cancel notification method
    playNotificationSound,
    triggerVibration,
  }
}
