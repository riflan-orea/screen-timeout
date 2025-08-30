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
  isManuallyStopped: boolean // New state to track manual stops
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

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

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

    // Update state
    setState(prev => ({
      ...prev,
      isActive: true,
      isStarting: false,
      isManuallyStopped: false, // Clear manual stop flag
      nextReminderTime: nextReminderTime.toDate(),
      timeUntilNextReminder: timeUntilReminder,
      sessionStartTime: prev.sessionStartTime || sessionStart,
    }))

    // Set the timeout
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
  }, [checkIsWithinActiveHours, getTimeoutIntervalMs])

  // Stop the timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    setState(prev => ({
      ...prev,
      isActive: false,
      isStarting: false,
      isManuallyStopped: true, // Mark as manually stopped
      nextReminderTime: null,
      timeUntilNextReminder: null,
    }))
  }, [])

  // Reset the timer
  const resetTimer = useCallback(() => {
    if (typeof window === 'undefined') return
    
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const newSessionStart = new Date()
    localStorage.removeItem("lastTimeoutReminderTime")
    localStorage.setItem("sessionStartTime", newSessionStart.toISOString())

    setState(prev => ({
      ...prev,
      isActive: false,
      isStarting: false,
      isManuallyStopped: false, // Clear manual stop flag for reset
      sessionStartTime: newSessionStart,
      lastReminderTime: null,
      nextReminderTime: null,
      timeUntilNextReminder: null,
    }))

    // Start timer after a short delay
    setTimeout(() => {
      startTimer()
    }, 100)
  }, [startTimer])

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
  }, [])

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
