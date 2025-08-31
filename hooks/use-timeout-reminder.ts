"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import moment from "moment"

interface TimeoutReminderConfig {
  activeHours: { start: string; end: string }
  timeoutInterval: { value: number; unit: string }
  isEnabled: boolean
}

interface TimeoutReminderState {
  isActive: boolean
  isWithinActiveHours: boolean
  nextReminderTime: Date | null
  timeUntilNextReminder: number | null
  sessionStartTime: Date | null
  lastReminderTime: Date | null
  isStarting: boolean
  isManuallyStopped: boolean // Track manual stops
  stopDate: string | null // Track the date when timer was manually stopped
}

export function useTimeoutReminder(config: TimeoutReminderConfig, onTimeout: () => void) {
  const [state, setState] = useState<TimeoutReminderState>({
    isActive: false,
    isWithinActiveHours: false,
    nextReminderTime: null,
    timeUntilNextReminder: null,
    sessionStartTime: null,
    lastReminderTime: null,
    isStarting: false,
    isManuallyStopped: false,
    stopDate: null,
  })

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const configRef = useRef(config)
  const onTimeoutRef = useRef(onTimeout)

  configRef.current = config
  onTimeoutRef.current = onTimeout

  // Check if current time is within active hours
  const checkIsWithinActiveHours = useCallback((activeHours: { start: string; end: string }): boolean => {
    const now = moment()
    const startTime = moment(activeHours.start, "HH:mm")
    const endTime = moment(activeHours.end, "HH:mm")
    
    // Handle overnight periods (e.g., 22:00 to 06:00)
    if (endTime.isBefore(startTime)) {
      return now.isAfter(startTime) || now.isBefore(endTime)
    } else {
      return now.isBetween(startTime, endTime, null, '[]') // inclusive
    }
  }, [])

  // Convert interval to milliseconds
  const getTimeoutIntervalMs = useCallback((timeoutInterval: { value: number; unit: string }): number => {
    const { value, unit } = timeoutInterval
    return moment.duration(value, unit as moment.DurationInputArg2).asMilliseconds()
  }, [])

  // Schedule notification through service worker
  const scheduleNotification = useCallback((delayMs: number, message: string) => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    try {
      // Generate unique ID for this notification
      const notificationId = `timeout-reminder-${Date.now()}`
      
      // Store notification info in localStorage for service worker to access
      const notificationData = {
        id: notificationId,
        title: "Timeout Reminder",
        body: message,
        scheduledTime: Date.now() + delayMs,
        interval: delayMs
      }
      
      localStorage.setItem('scheduledNotification', JSON.stringify(notificationData))
      
      // Send message to service worker to schedule notification
      navigator.serviceWorker.ready.then(registration => {
        if (registration.active) {
          registration.active.postMessage({
            type: 'SCHEDULE_BACKGROUND_NOTIFICATION',
            ...notificationData
          })
          console.log('[TimeoutReminder] Background notification scheduled:', notificationData)
        }
      }).catch(error => {
        console.error('[TimeoutReminder] Error scheduling background notification:', error)
      })
    } catch (error) {
      console.error('[TimeoutReminder] Error scheduling notification:', error)
    }
  }, [])

  // Cancel scheduled notifications
  const cancelScheduledNotifications = useCallback(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    try {
      // Clear stored notification data
      localStorage.removeItem('scheduledNotification')
      
      // Send message to service worker to cancel notifications
      navigator.serviceWorker.ready.then(registration => {
        if (registration.active) {
          registration.active.postMessage({
            type: 'CANCEL_ALL_NOTIFICATIONS'
          })
          console.log('[TimeoutReminder] All background notifications cancelled')
        }
      }).catch(error => {
        console.error('[TimeoutReminder] Error cancelling notifications:', error)
      })
    } catch (error) {
      console.error('[TimeoutReminder] Error cancelling notifications:', error)
    }
  }, [])

  // Start the timer
  const startTimer = useCallback(async () => {
    if (typeof window === 'undefined') return
    
    const currentConfig = configRef.current
    
    // Set starting state to disable button
    setState(prev => ({ ...prev, isStarting: true }))
    
    // Check conditions
    if (!currentConfig.isEnabled) {
      setState(prev => ({ ...prev, isStarting: false }))
      return
    }
    
    if (!checkIsWithinActiveHours(currentConfig.activeHours)) {
      setState(prev => ({ ...prev, isStarting: false }))
      return
    }

    // Clear any existing timer and scheduled notifications
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    cancelScheduledNotifications()

    const now = moment()
    const intervalMs = getTimeoutIntervalMs(currentConfig.timeoutInterval)
    
    // Check if there was a previous reminder and calculate next time
    const lastReminderStr = localStorage.getItem("lastTimeoutReminderTime")
    let nextReminderTime: moment.Moment
    
    if (lastReminderStr) {
      const lastReminder = moment(lastReminderStr)
      const nextTime = lastReminder.add(intervalMs, 'milliseconds')
      nextReminderTime = nextTime.isAfter(now) ? nextTime : now.add(intervalMs, 'milliseconds')
    } else {
      nextReminderTime = now.add(intervalMs, 'milliseconds')
    }

    const timeUntilReminder = nextReminderTime.diff(now)
    const sessionStart = now.toDate()

    // Save session start time
    localStorage.setItem("sessionStartTime", sessionStart.toISOString())

    // Clear stop date from localStorage when starting
    localStorage.removeItem("timerStopDate")

    // Schedule background notification
    const message = `⏰ Time for a break! You've been working for ${currentConfig.timeoutInterval.value} ${currentConfig.timeoutInterval.unit}${currentConfig.timeoutInterval.value > 1 ? 's' : ''}.`
    scheduleNotification(Math.max(timeUntilReminder, 0), message)

    // Update state
    setState(prev => ({
      ...prev,
      isActive: true,
      isStarting: false,
      isManuallyStopped: false, // Clear manual stop flag
      stopDate: null,
      nextReminderTime: nextReminderTime.toDate(),
      timeUntilNextReminder: timeUntilReminder,
      sessionStartTime: prev.sessionStartTime || sessionStart,
    }))

    // Set the timeout for immediate feedback (when app is open)
    timerRef.current = setTimeout(async () => {
      const reminderTime = moment()
      localStorage.setItem("lastTimeoutReminderTime", reminderTime.toISOString())

      setState(prev => ({
        ...prev,
        lastReminderTime: reminderTime.toDate(),
      }))

      try {
        await onTimeoutRef.current()
      } catch (error) {
        console.error('[TimeoutReminder] Error in onTimeout callback:', error)
      }

      // Restart timer for next interval
      startTimer()
    }, Math.max(timeUntilReminder, 0))
  }, [checkIsWithinActiveHours, getTimeoutIntervalMs, scheduleNotification, cancelScheduledNotifications])

  // Check if it's a new day since the timer was stopped
  const isNewDaySinceStop = useCallback((stopDate: string): boolean => {
    const stopMoment = moment(stopDate, 'YYYY-MM-DD')
    const today = moment().startOf('day')
    return stopMoment.isBefore(today)
  }, [])

  // Stop the timer
  const stopTimer = useCallback(() => {
    if (typeof window === 'undefined') return
    
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    // Cancel scheduled notifications
    cancelScheduledNotifications()

    const today = moment().format('YYYY-MM-DD')
    localStorage.setItem("timerStopDate", today)

    setState(prev => ({
      ...prev,
      isActive: false,
      isStarting: false,
      isManuallyStopped: true, // Mark as manually stopped
      stopDate: today,
      nextReminderTime: null,
      timeUntilNextReminder: null,
    }))
  }, [cancelScheduledNotifications])

  // Reset the timer
  const resetTimer = useCallback(() => {
    if (typeof window === 'undefined') return
    
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    // Cancel scheduled notifications
    cancelScheduledNotifications()

    const newSessionStart = new Date()
    localStorage.removeItem("lastTimeoutReminderTime")
    localStorage.removeItem("timerStopDate")
    localStorage.setItem("sessionStartTime", newSessionStart.toISOString())

    setState(prev => ({
      ...prev,
      isActive: false,
      isStarting: false,
      isManuallyStopped: false, // Clear manual stop flag for reset
      stopDate: null,
      sessionStartTime: newSessionStart,
      lastReminderTime: null,
      nextReminderTime: null,
      timeUntilNextReminder: null,
    }))

    // Start timer after a short delay
    setTimeout(() => {
      startTimer()
    }, 100)
  }, [startTimer, cancelScheduledNotifications])

  // Load saved data on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const savedSessionStart = localStorage.getItem("sessionStartTime")
    if (savedSessionStart) {
      setState(prev => ({
        ...prev,
        sessionStartTime: new Date(savedSessionStart),
      }))
    }

    const savedLastReminder = localStorage.getItem("lastTimeoutReminderTime")
    if (savedLastReminder) {
      setState(prev => ({
        ...prev,
        lastReminderTime: new Date(savedLastReminder),
      }))
    }

    // Load saved stop date and check if it's a new day
    const savedStopDate = localStorage.getItem("timerStopDate")
    if (savedStopDate) {
      const isNewDay = isNewDaySinceStop(savedStopDate)
      
      setState(prev => ({
        ...prev,
        stopDate: savedStopDate,
        isManuallyStopped: !isNewDay, // Only consider manually stopped if it's not a new day
      }))

      // If it's a new day, clear the stop date from localStorage
      if (isNewDay) {
        localStorage.removeItem("timerStopDate")
      }
    }
  }, [isNewDaySinceStop])

  // Update timer display every second
  useEffect(() => {
    const updateTimer = () => {
      const now = moment()
      const withinHours = checkIsWithinActiveHours(configRef.current.activeHours)

      setState(prev => {
        const timeUntilNextReminder = prev.nextReminderTime 
          ? moment(prev.nextReminderTime).diff(now)
          : null

        return {
          ...prev,
          isWithinActiveHours: withinHours,
          timeUntilNextReminder: timeUntilNextReminder && timeUntilNextReminder > 0 ? timeUntilNextReminder : null,
        }
      })
    }

    updateTimer()
    updateIntervalRef.current = setInterval(updateTimer, 1000)

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
    }
  }, [checkIsWithinActiveHours])

  // Auto-start/stop timer based on conditions (but respect manual stops)
  useEffect(() => {
    const currentConfig = configRef.current
    const shouldBeActive = currentConfig.isEnabled && state.isWithinActiveHours
    
    // Only auto-start if not manually stopped
    if (shouldBeActive && !state.isActive && !state.isStarting && !state.isManuallyStopped) {
      startTimer()
    } else if (!shouldBeActive && state.isActive) {
      stopTimer()
    }
  }, [config.isEnabled, state.isWithinActiveHours, state.isActive, state.isStarting, state.isManuallyStopped, startTimer, stopTimer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
    }
  }, [])

  // Format time remaining
  const formatTimeRemaining = useCallback((ms: number): string => {
    const duration = moment.duration(ms)
    const hours = Math.floor(duration.asHours())
    const minutes = duration.minutes()
    const seconds = duration.seconds()

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }, [])

  return {
    ...state,
    startTimer,
    stopTimer,
    resetTimer,
    formatTimeRemaining,
    getTimeoutIntervalMs: () => getTimeoutIntervalMs(config.timeoutInterval),
  }
}
