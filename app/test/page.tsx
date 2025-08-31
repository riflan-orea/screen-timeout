"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Info, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { useNotification } from "@/hooks/use-notification"
import { useServiceWorker } from "@/hooks/use-service-worker"

export default function TestPage() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const notification = useNotification()
  const serviceWorker = useServiceWorker()

  const addTestResult = (test: string, status: 'success' | 'error' | 'warning', message: string) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test,
      status,
      message,
      timestamp: new Date().toISOString()
    }])
  }

  const runBackgroundNotificationTest = async (delaySeconds: number = 30) => {
    setIsRunning(true)
    addTestResult('Background Notification Test', 'warning', `Starting test with ${delaySeconds} second delay...`)

    try {
      if (!('serviceWorker' in navigator)) {
        addTestResult('Service Worker Support', 'error', 'Service Worker not supported in this browser')
        return
      }

      const registration = await navigator.serviceWorker.ready
      if (!registration.active) {
        addTestResult('Service Worker Status', 'error', 'No active Service Worker found')
        return
      }

      addTestResult('Service Worker Status', 'success', 'Service Worker is active and ready')

      const notificationData = {
        type: 'SCHEDULE_BACKGROUND_NOTIFICATION',
        title: 'Background Test Notification',
        body: `This notification was scheduled ${delaySeconds} seconds ago and should appear even with the app closed!`,
        scheduledTime: Date.now() + (delaySeconds * 1000),
        interval: null, // One-time notification
        id: `test-${Date.now()}`
      }

      registration.active.postMessage(notificationData)
      addTestResult('Notification Scheduling', 'success', `Background notification scheduled for ${delaySeconds} seconds from now`)

      // Test background sync registration
      if ('sync' in registration) {
        try {
          await (registration as any).sync.register('timeout-reminder-sync')
          addTestResult('Background Sync', 'success', 'Background sync registered successfully')
        } catch (error) {
          addTestResult('Background Sync', 'warning', `Background sync registration failed: ${error}`)
        }
      } else {
        addTestResult('Background Sync', 'warning', 'Background sync not supported')
      }

      // Test periodic background sync
      if ('periodicSync' in registration) {
        try {
          const status = await navigator.permissions.query({
            name: 'periodic-background-sync' as any
          })
          
          if (status.state === 'granted') {
            await (registration as any).periodicSync.register('timeout-reminder-periodic', {
              minInterval: 30000
            })
            addTestResult('Periodic Background Sync', 'success', 'Periodic background sync registered successfully')
          } else {
            addTestResult('Periodic Background Sync', 'warning', 'Periodic background sync permission not granted')
          }
        } catch (error) {
          addTestResult('Periodic Background Sync', 'warning', `Periodic background sync error: ${error}`)
        }
      } else {
        addTestResult('Periodic Background Sync', 'warning', 'Periodic background sync not supported')
      }

      addTestResult('Test Instructions', 'warning', `Close this tab/browser completely and wait ${delaySeconds} seconds for the notification to appear`)

    } catch (error) {
      addTestResult('Test Execution', 'error', `Error running test: ${error}`)
    } finally {
      setIsRunning(false)
    }
  }

  const cancelAllNotifications = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        if (registration.active) {
          registration.active.postMessage({
            type: 'CANCEL_ALL_NOTIFICATIONS'
          })
          addTestResult('Cancel Notifications', 'success', 'All notifications cancelled')
        }
      }
    } catch (error) {
      addTestResult('Cancel Notifications', 'error', `Error cancelling notifications: ${error}`)
    }
  }

  const testImmediateNotification = async () => {
    try {
      const success = await notification.showTimeoutReminder("This is a test notification to verify immediate notification functionality.")
      if (success) {
        addTestResult('Immediate Notification', 'success', 'Immediate notification sent successfully')
      } else {
        addTestResult('Immediate Notification', 'error', 'Failed to send immediate notification')
      }
    } catch (error) {
      addTestResult('Immediate Notification', 'error', `Error sending immediate notification: ${error}`)
    }
  }

  const clearTestResults = () => {
    setTestResults([])
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Background Notification Test</h1>
            <p className="text-muted-foreground">Test and debug background notification functionality</p>
          </div>
          <Button variant="outline" onClick={clearTestResults}>
            Clear Results
          </Button>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current system capabilities and permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>Notifications Supported</span>
                <Badge variant={notification.isSupported ? "default" : "destructive"}>
                  {notification.isSupported ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>Notification Permission</span>
                <Badge variant={notification.permission === "granted" ? "default" : "destructive"}>
                  {notification.permission}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>Service Worker Supported</span>
                <Badge variant={serviceWorker.isSupported ? "default" : "destructive"}>
                  {serviceWorker.isSupported ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>Service Worker Registered</span>
                <Badge variant={serviceWorker.isRegistered ? "default" : "destructive"}>
                  {serviceWorker.isRegistered ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>Background Support</span>
                <Badge variant={notification.hasBackgroundSupport ? "default" : "destructive"}>
                  {notification.hasBackgroundSupport ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>Android Device</span>
                <Badge variant={serviceWorker.isAndroid ? "default" : "secondary"}>
                  {serviceWorker.isAndroid ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
            <CardDescription>Run various tests to verify functionality</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => runBackgroundNotificationTest(30)}
                disabled={isRunning}
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Test 30s Background
              </Button>
              <Button 
                onClick={() => runBackgroundNotificationTest(60)}
                disabled={isRunning}
                variant="outline"
              >
                Test 1min Background
              </Button>
              <Button 
                onClick={() => runBackgroundNotificationTest(300)}
                disabled={isRunning}
                variant="outline"
              >
                Test 5min Background
              </Button>
              <Button 
                onClick={testImmediateNotification}
                disabled={isRunning}
                variant="outline"
              >
                Test Immediate
              </Button>
              <Button 
                onClick={cancelAllNotifications}
                disabled={isRunning}
                variant="destructive"
              >
                Cancel All
              </Button>
            </div>
            
            {isRunning && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Test is running... Please wait and then close this tab to test background functionality.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>Results from the latest tests</CardDescription>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No test results yet. Run a test to see results here.</p>
            ) : (
              <div className="space-y-3">
                {testResults.map((result) => (
                  <div key={result.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{result.test}</span>
                        <Badge variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}>
                          {result.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>How to test background notifications:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Click one of the background test buttons above</li>
              <li>Close this tab/browser completely</li>
              <li>Wait for the specified time period</li>
              <li>The notification should appear even with the app closed</li>
              <li>If using Android, install as PWA for best results</li>
            </ol>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
