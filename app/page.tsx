"use client"

import { useEffect } from "react"
import { Clock, Play, Pause, Info, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ThemeToggle } from "@/components/theme-toggle"
import { SettingsDialog } from "@/components/settings-dialog"
import { PWAStatus } from "@/components/pwa-status"
import { PWAInstallButton } from "@/components/pwa-install-button"
import { useNotification } from "@/hooks/use-notification"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useTimeoutReminder } from "@/hooks/use-timeout-reminder"

export default function TimeoutReminderApp() {
  const notification = useNotification()
  const [activeHours, setActiveHours] = useLocalStorage("activeHours", { start: "09:00", end: "18:00" })
  const [timeoutInterval, setTimeoutInterval] = useLocalStorage("timeoutInterval", { value: 1, unit: "hours" })

  const formatTimeoutInterval = () => {
    const { value, unit } = timeoutInterval
    return `${value} ${unit === "hours" ? (value === 1 ? "hour" : "hours") : value === 1 ? "minute" : "minutes"}`
  }

  const timeoutReminder = useTimeoutReminder(
    {
      activeHours,
      timeoutInterval,
      isEnabled: notification.isEnabled,
    },
    async () => {
      await notification.showTimeoutReminder(`Time for a break! You've been working for ${formatTimeoutInterval()}.`)
    },
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const hasShownWelcome = localStorage.getItem("hasShownWelcome")
    if (!hasShownWelcome && notification.isEnabled) {
      setTimeout(() => {
        notification.showTimeoutReminder("Welcome to Timeout Reminder! Your productivity assistant is now active.")
        localStorage.setItem("hasShownWelcome", "true")
      }, 2000)
    }
  }, [notification.isEnabled, notification.showTimeoutReminder])

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      const success = await notification.requestPermission()
      if (success) {
        await notification.showTimeoutReminder("Notifications are now enabled! You'll receive reminders like this one.")
      }
    }
  }



  const formatActiveHours = () => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(":")
      const hour = Number.parseInt(hours)
      const ampm = hour >= 12 ? "PM" : "AM"
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      return `${displayHour}:${minutes} ${ampm}`
    }
    return `${formatTime(activeHours.start)} - ${formatTime(activeHours.end)}`
  }

  const formatTime12Hour = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getProgressPercentage = (): number => {
    if (!timeoutReminder.timeUntilNextReminder) return 0
    const totalMs = timeoutReminder.getTimeoutIntervalMs()
    const remainingMs = timeoutReminder.timeUntilNextReminder
    return Math.max(0, Math.min(100, ((totalMs - remainingMs) / totalMs) * 100))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">Timeout Reminder</h1>
              {/* {notification.hasBackgroundSupport && (
                <Badge variant="outline" className="text-xs">
                  <Wifi className="h-3 w-3 mr-1" />
                  Background
                </Badge>
              )} */}
            </div>

            <div className="flex items-center gap-2">
              <PWAInstallButton />

              <SettingsDialog
                notificationsEnabled={notification.isEnabled}
                onNotificationToggle={handleNotificationToggle}
                activeHours={activeHours}
                onActiveHoursChange={setActiveHours}
                timeoutInterval={timeoutInterval}
                onTimeoutIntervalChange={setTimeoutInterval}
                onTimerReset={timeoutReminder.resetTimer}
              />

              {/* Theme Toggle */}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Browser Support Alert */}
          {!notification.isSupported && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Your browser doesn't support notifications. Please use a modern browser like Chrome, Firefox, or Safari
                for the best experience.
              </AlertDescription>
            </Alert>
          )}

          {/* Service Worker Status Alert */}
          {notification.isEnabled && !notification.hasBackgroundSupport && (
            <Alert>
              <WifiOff className="h-4 w-4" />
              <AlertDescription>
                Background notifications are not available. Notifications will only work while the app is open.
              </AlertDescription>
            </Alert>
          )}

          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Current Status</CardTitle>
                  <CardDescription>
                    {timeoutReminder.isWithinActiveHours ? "Within active hours" : "Outside active hours"}
                    {notification.hasBackgroundSupport && " • Background notifications enabled"}
                  </CardDescription>
                </div>
                <Badge variant={timeoutReminder.isActive ? "default" : "secondary"}>
                  {timeoutReminder.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Active Period</p>
                    <p className="text-sm text-muted-foreground">{formatActiveHours()}</p>
                  </div>
                  <div>
                    <p className="font-medium">Timeout Interval</p>
                    <p className="text-sm text-muted-foreground">{formatTimeoutInterval()}</p>
                  </div>
                </div>

                {timeoutReminder.isActive && timeoutReminder.nextReminderTime && (
                  <div className="space-y-3">
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-primary">Next Reminder</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTime12Hour(timeoutReminder.nextReminderTime)}
                        </p>
                      </div>
                      {timeoutReminder.timeUntilNextReminder && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Time remaining:</span>
                            <span className="font-mono">
                              {timeoutReminder.formatTimeRemaining(timeoutReminder.timeUntilNextReminder)}
                            </span>
                          </div>
                          <Progress value={getProgressPercentage()} className="h-2" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {timeoutReminder.lastReminderTime && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-medium">Last Reminder</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime12Hour(timeoutReminder.lastReminderTime)} on {timeoutReminder.lastReminderTime.toLocaleDateString()}
                    </p>
                  </div>
                )}

                {timeoutReminder.sessionStartTime && (
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <p className="font-medium">Session Started</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime12Hour(timeoutReminder.sessionStartTime)} on {timeoutReminder.sessionStartTime.toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timer Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timer Controls</CardTitle>
              <CardDescription>Manually control your timeout reminder</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {!timeoutReminder.isActive ? (
                  <Button
                    onClick={timeoutReminder.startTimer}
                    disabled={timeoutReminder.isStarting || !notification.isEnabled}
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    {timeoutReminder.isStarting ? "Starting..." : "Start Timer"}
                  </Button>
                ) : (
                  <Button
                    onClick={timeoutReminder.stopTimer}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <Pause className="h-4 w-4" />
                    Stop Timer
                  </Button>
                )}
              </div>
              {!notification.isEnabled && (
                <p className="text-xs text-muted-foreground mt-3">
                  Note: Enable notifications in settings to receive automatic timeout reminders
                </p>
              )}
              {notification.isEnabled && notification.hasBackgroundSupport && (
                <p className="text-xs text-success mt-3">
                  ✓ Background notifications enabled - you'll receive reminders even when the app is closed
                </p>
              )}
              {timeoutReminder.isStarting && (
                <p className="text-xs text-blue-600 mt-3">
                  ⏳ Starting timer...
                </p>
              )}
              {timeoutReminder.isActive && (
                <p className="text-xs text-green-600 mt-3">
                  ✓ Timer is active and running
                </p>
              )}
              {!timeoutReminder.isWithinActiveHours && notification.isEnabled && (
                <p className="text-xs text-orange-600 mt-3">
                  ⏰ Timer will start automatically when within active hours
                </p>
              )}
            </CardContent>
          </Card>

          {/* PWA Status Card */}
          {/* <PWAStatus /> */}

          {/* Notification Setup Card */}
          {!notification.isEnabled && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enable Notifications</CardTitle>
                <CardDescription>Allow notifications to receive timeout reminders</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full" onClick={() => handleNotificationToggle(true)}>
                  Enable Push Notifications
                </Button>
                <p className="text-xs text-muted-foreground">
                  {!notification.isSupported
                    ? "Notifications are not supported in this browser"
                    : "Please enable push notifications in your browser to get reminders"}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Test notification section hidden
            {notification.isEnabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Test Notifications</CardTitle>
                  <CardDescription>
                    Test your notification settings
                    {notification.hasBackgroundSupport && " (Background support active)"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full bg-transparent" onClick={handleTestNotification}>
                    Send Test Notification
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Click to test notification with sound and vibration
                    {notification.hasBackgroundSupport && " • Works even when app is closed"}
                  </p>
                </CardContent>
              </Card>
            )}
            */}
        </div>
      </main>

             {/* PWA Install Prompt - Hidden */}
    </div>
  )
}
