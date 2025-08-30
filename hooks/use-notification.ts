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

  // Initialize notification state
  useEffect(() => {
    if (typeof window === "undefined") return
    
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
    if (typeof window === "undefined" || !state.isSupported) {
      console.warn("Notifications are not supported in this browser")
      return false
    }

    if (state.permission === "granted") {
      return true
    }

    try {
      const permission = await Notification.requestPermission()
      setState((prev) => ({ ...prev, permission }))

      // Store permission state
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("notificationPermission", permission)
      }

      return permission === "granted"
    } catch (error) {
      console.error("Error requesting notification permission:", error)
      return false
    }
  }, [state.isSupported, state.permission])

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (typeof window === "undefined") return
    
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
    if (typeof window === "undefined" || typeof navigator === "undefined") return
    
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
      if (typeof window === "undefined" || !state.isSupported || state.permission !== "granted") {
        console.warn("Cannot show notification: not supported or permission denied")
        return false
      }

      try {
        if (swSupported && swRegistered) {
          // For immediate notifications, still use direct API
          const notification = new Notification(options.title, {
            body: options.body,
            icon: options.icon || "/favicon.ico",
            tag: options.tag || "timeout-reminder",
            requireInteraction: options.requireInteraction || true,
            silent: false,
          })

          // Handle notification click
          notification.onclick = () => {
            window.focus()
            notification.close()
          }

          // Auto-close after 10 seconds
          setTimeout(() => {
            notification.close()
          }, 10000)
        } else {
          // Fallback to regular notification
          const notification = new Notification(options.title, {
            body: options.body,
            icon: options.icon || "/favicon.ico",
            tag: options.tag || "timeout-reminder",
            requireInteraction: options.requireInteraction || true,
            silent: false,
          })

          notification.onclick = () => {
            window.focus()
            notification.close()
          }

          setTimeout(() => {
            notification.close()
          }, 10000)
        }

        // Play sound and trigger vibration
        playNotificationSound()
        triggerVibration()

        // Store notification time
        const now = Date.now()
        if (typeof localStorage !== "undefined") {
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
      return showNotification({
        title: "Timeout Reminder",
        body: message || "Time for a break! You've been working for a while.",
        tag: "timeout-reminder",
        requireInteraction: true,
      })
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
    requestPermission,
    showNotification,
    showTimeoutReminder,
    scheduleTimeoutReminder, // Added scheduled notification method
    playNotificationSound,
    triggerVibration,
  }
}
