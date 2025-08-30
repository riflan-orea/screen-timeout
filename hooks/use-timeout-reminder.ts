"use client"

import { useState, useEffect, useCallback, useRef } from "react"

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
}

export function useTimeoutReminder(config: TimeoutReminderConfig, onTimeout: () => void) {
  const [state, setState] = useState<TimeoutReminderState>({
    isActive: false,
    isWithinActiveHours: false,
    nextReminderTime: null,
    timeUntilNextReminder: null,
    sessionStartTime: null,
    lastReminderTime: null,
  })

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const configRef = useRef(config)
  const onTimeoutRef = useRef(onTimeout)

  configRef.current = config
  onTimeoutRef.current = onTimeout

  const timeToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(":").map(Number)
    return hours * 60 + minutes
  }

  const checkIsWithinActiveHours = (activeHours: { start: string; end: string }): boolean => {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const startMinutes = timeToMinutes(activeHours.start)
    const endMinutes = timeToMinutes(activeHours.end)

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes
    } else {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes
    }
  }

  const getTimeoutIntervalMs = (timeoutInterval: { value: number; unit: string }): number => {
    const { value, unit } = timeoutInterval
    const multiplier = unit === "hours" ? 60 * 60 * 1000 : 60 * 1000
    return value * multiplier
  }

  const startTimer = useCallback(() => {
    const currentConfig = configRef.current
    if (!currentConfig.isEnabled || !checkIsWithinActiveHours(currentConfig.activeHours)) {
      return
    }

    const now = new Date()
    const intervalMs = getTimeoutIntervalMs(currentConfig.timeoutInterval)

    const lastReminderStr = typeof window !== "undefined" ? localStorage.getItem("lastTimeoutReminderTime") : null
    const lastReminderTime = lastReminderStr ? new Date(lastReminderStr) : null

    let nextReminderTime: Date
    if (lastReminderTime) {
      const nextTime = new Date(lastReminderTime.getTime() + intervalMs)
      nextReminderTime = nextTime > now ? nextTime : new Date(now.getTime() + intervalMs)
    } else {
      nextReminderTime = new Date(now.getTime() + intervalMs)
    }

    const timeUntilReminder = nextReminderTime.getTime() - now.getTime()
    const sessionStart = new Date()

    if (typeof window !== "undefined") {
      localStorage.setItem("sessionStartTime", sessionStart.toISOString())
    }

    setState((prev) => ({
      ...prev,
      isActive: true,
      nextReminderTime,
      timeUntilNextReminder: timeUntilReminder,
      sessionStartTime: prev.sessionStartTime || sessionStart,
    }))

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(
      () => {
        const reminderTime = new Date()
        if (typeof window !== "undefined") {
          localStorage.setItem("lastTimeoutReminderTime", reminderTime.toISOString())
        }

        setState((prev) => ({
          ...prev,
          lastReminderTime: reminderTime,
        }))

        onTimeoutRef.current()
        startTimer()
      },
      Math.max(timeUntilReminder, 0),
    )
  }, []) // Empty dependency array to prevent recreation

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    setState((prev) => ({
      ...prev,
      isActive: false,
      nextReminderTime: null,
      timeUntilNextReminder: null,
    }))
  }, [])

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const newSessionStart = new Date()

    setState((prev) => ({
      ...prev,
      isActive: false,
      sessionStartTime: newSessionStart,
      lastReminderTime: null,
      nextReminderTime: null,
      timeUntilNextReminder: null,
    }))

    if (typeof window !== "undefined") {
      localStorage.removeItem("lastTimeoutReminderTime")
      localStorage.setItem("sessionStartTime", newSessionStart.toISOString())
    }

    setTimeout(() => {
      startTimer()
    }, 100)
  }, [startTimer])

  useEffect(() => {
    const savedSessionStart = typeof window !== "undefined" ? localStorage.getItem("sessionStartTime") : null
    if (savedSessionStart) {
      setState((prev) => ({
        ...prev,
        sessionStartTime: new Date(savedSessionStart),
      }))
    }

    const savedLastReminder = typeof window !== "undefined" ? localStorage.getItem("lastTimeoutReminderTime") : null
    if (savedLastReminder) {
      setState((prev) => ({
        ...prev,
        lastReminderTime: new Date(savedLastReminder),
      }))
    }
  }, [])

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const withinHours = checkIsWithinActiveHours(configRef.current.activeHours)

      setState((prev) => {
        const timeUntilNextReminder = prev.nextReminderTime ? prev.nextReminderTime.getTime() - now.getTime() : null

        return {
          ...prev,
          isWithinActiveHours: withinHours,
          timeUntilNextReminder: timeUntilNextReminder && timeUntilNextReminder > 0 ? timeUntilNextReminder : null,
        }
      })
    }

    updateTimer()
    checkIntervalRef.current = setInterval(updateTimer, 1000)

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const currentConfig = configRef.current
    if (currentConfig.isEnabled && state.isWithinActiveHours && !state.isActive) {
      startTimer()
    } else if ((!currentConfig.isEnabled || !state.isWithinActiveHours) && state.isActive) {
      stopTimer()
    }
  }, [config.isEnabled, state.isWithinActiveHours, state.isActive]) // Removed function dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [])

  const formatTimeRemaining = useCallback((ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

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
