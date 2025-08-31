"use client"

import { useEffect } from "react"
import { Info, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useNotification } from "@/hooks/use-notification"
import { useServiceWorker } from "@/hooks/use-service-worker"
import Link from "next/link"

export default function TestPage() {
  const notification = useNotification()
  const serviceWorker = useServiceWorker()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">Test & Debug</h1>
            </div>
            <Link href="/">
              <Button variant="outline">Back to App</Button>
            </Link>
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

          {/* Debug Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Debug Information</CardTitle>
              <CardDescription>Current notification and service worker status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Notifications Supported:</strong> {notification.isSupported ? "✅" : "❌"}</p>
                  <p><strong>Permission:</strong> {notification.permission}</p>
                  <p><strong>Notifications Enabled:</strong> {notification.isEnabled ? "✅" : "❌"}</p>
                  <p><strong>Android Device:</strong> {notification.isAndroid ? "✅" : "❌"}</p>
                </div>
                <div>
                  <p><strong>Service Worker Supported:</strong> {typeof navigator !== 'undefined' && "serviceWorker" in navigator ? "✅" : "❌"}</p>
                  <p><strong>Background Support:</strong> {notification.hasBackgroundSupport ? "✅" : "❌"}</p>
                  <p><strong>SW Controller:</strong> {typeof navigator !== 'undefined' && navigator.serviceWorker?.controller ? "✅" : "❌"}</p>
                  <p><strong>User Agent:</strong> {typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'N/A'}</p>
                </div>
              </div>
              {notification.isAndroid && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">Android Device Detected</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Android devices may require additional setup for notifications. Make sure:
                  </p>
                  <ul className="text-xs text-yellow-700 mt-2 list-disc list-inside space-y-1">
                    <li>Notifications are enabled in Android settings</li>
                    <li>Browser notifications are allowed</li>
                    <li>App is added to home screen (PWA)</li>
                    <li>Battery optimization is disabled for the app</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test notification section */}
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
                <Button variant="outline" className="w-full bg-transparent" onClick={() => notification.showTimeoutReminder("🔔 This is a test notification to verify your push notifications are working correctly!")}>
                  Send Test Notification
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Click to test notification with sound and vibration
                  {notification.hasBackgroundSupport && " • Works even when app is closed"}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Service Worker Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service Worker Status</CardTitle>
              <CardDescription>Detailed service worker information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Service Worker Supported:</strong> {serviceWorker.isSupported ? "✅" : "❌"}</p>
                  <p><strong>Service Worker Registered:</strong> {serviceWorker.isRegistered ? "✅" : "❌"}</p>
                  <p><strong>Android Device:</strong> {serviceWorker.isAndroid ? "✅" : "❌"}</p>
                </div>
                <div>
                  <p><strong>SW Controller:</strong> {typeof navigator !== 'undefined' && navigator.serviceWorker?.controller ? "✅" : "❌"}</p>
                  <p><strong>SW Ready:</strong> {typeof navigator !== 'undefined' && navigator.serviceWorker?.ready ? "✅" : "❌"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Pages</CardTitle>
              <CardDescription>Access additional test pages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Link href="/test-notifications.html" target="_blank">
                  <Button variant="outline">Basic Notification Tests</Button>
                </Link>
                <Link href="/test-background-notifications.html" target="_blank">
                  <Button variant="outline">Background Notification Tests</Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                These pages provide comprehensive testing for notification functionality
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
