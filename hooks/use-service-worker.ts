"use client"

import { useEffect, useState } from "react"

export function useServiceWorker() {
  const [isSupported, setIsSupported] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return
    
    if ("serviceWorker" in navigator) {
      setIsSupported(true)

      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[SW] Service worker registered:", registration)
          setIsRegistered(true)
        })
        .catch((error) => {
          console.error("[SW] Service worker registration failed:", error)
        })
    }
  }, [])

  const scheduleNotification = (title: string, body: string, delay: number) => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return
    
    if (isRegistered && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SCHEDULE_NOTIFICATION",
        title,
        body,
        delay,
      })
    }
  }

  return {
    isSupported,
    isRegistered,
    scheduleNotification,
  }
}
