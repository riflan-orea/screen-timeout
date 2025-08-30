"use client"

import dynamic from "next/dynamic"

// Dynamically import the client component to prevent SSR issues
const TimeoutReminderApp = dynamic(() => import("@/components/timeout-reminder-app"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center min-h-screen">Loading...</div>
})

export default function Page() {
  return <TimeoutReminderApp />
}