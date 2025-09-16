"use client"

import { useState, useEffect } from "react"
import { Settings, Clock, Bell, Info, RotateCcw, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TimeInput } from "@/components/ui/time-input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface SettingsDialogProps {
  notificationsEnabled: boolean
  onNotificationToggle: (enabled: boolean) => void
  activeHours: { start: string; end: string }
  onActiveHoursChange: (hours: { start: string; end: string }) => void
  timeoutInterval: { value: number; unit: string }
  onTimeoutIntervalChange: (interval: { value: number; unit: string }) => void
  onTimerReset?: () => void
  pushSubscription?: {
    isSupported: boolean
    isSubscribed: boolean
    isLoading: boolean
    error: string | null
    resetSubscription: () => Promise<boolean>
    clearError: () => void
  }
}

export function SettingsDialog({
  notificationsEnabled,
  onNotificationToggle,
  activeHours,
  onActiveHoursChange,
  timeoutInterval,
  onTimeoutIntervalChange,
  onTimerReset,
  pushSubscription,
}: SettingsDialogProps) {
  const [localActiveHours, setLocalActiveHours] = useState(activeHours)
  const [localTimeoutInterval, setLocalTimeoutInterval] = useState(timeoutInterval)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setLocalActiveHours(activeHours)
    setLocalTimeoutInterval(timeoutInterval)
  }, [activeHours, timeoutInterval])

  const handleSave = () => {
    const hoursChanged = localActiveHours.start !== activeHours.start || localActiveHours.end !== activeHours.end

    const intervalChanged =
      localTimeoutInterval.value !== timeoutInterval.value || localTimeoutInterval.unit !== timeoutInterval.unit

    if (hoursChanged || intervalChanged) {
      onActiveHoursChange(localActiveHours)
      onTimeoutIntervalChange(localTimeoutInterval)

      if (onTimerReset) {
        onTimerReset()
      }
    }

    setIsOpen(false)
  }

  const handleCancel = () => {
    setLocalActiveHours(activeHours)
    setLocalTimeoutInterval(timeoutInterval)
    setIsOpen(false)
  }

  const [canEnableNotifications, setCanEnableNotifications] = useState(false)
  const [isResettingSubscription, setIsResettingSubscription] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCanEnableNotifications("Notification" in window)
    }
  }, [])

  const handleResetSubscription = async () => {
    if (!pushSubscription) return
    
    setIsResettingSubscription(true)
    try {
      const success = await pushSubscription.resetSubscription()
      if (success) {
        // Optionally show a success message
        console.log('Push subscription reset successfully')
      }
    } catch (error) {
      console.error('Failed to reset push subscription:', error)
    } finally {
      setIsResettingSubscription(false)
    }
  }

  const isValidTimeRange = () => {
    const startMinutes =
      Number.parseInt(localActiveHours.start.split(":")[0]) * 60 + Number.parseInt(localActiveHours.start.split(":")[1])
    const endMinutes =
      Number.parseInt(localActiveHours.end.split(":")[0]) * 60 + Number.parseInt(localActiveHours.end.split(":")[1])
    return startMinutes !== endMinutes // At least some time difference
  }

  const isValidInterval = () => {
    return localTimeoutInterval.value > 0 && localTimeoutInterval.value <= 480 // Max 8 hours
  }

  const canSave = isValidTimeRange() && isValidInterval()

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>Configure your timeout reminder preferences</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6 mt-6">
              {/* Active Hours Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Active Hours
                  </CardTitle>
                  <CardDescription>Set when timeout reminders should be active</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-time">Start Time</Label>
                      <TimeInput
                        id="start-time"
                        value={localActiveHours.start}
                        onChange={(value) => setLocalActiveHours({ ...localActiveHours, start: value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-time">End Time</Label>
                      <TimeInput
                        id="end-time"
                        value={localActiveHours.end}
                        onChange={(value) => setLocalActiveHours({ ...localActiveHours, end: value })}
                      />
                    </div>
                  </div>
                  {!isValidTimeRange() && <p className="text-sm text-destructive">Start and end times must be different</p>}
                </CardContent>
              </Card>

              {/* Timeout Interval Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Timeout Interval</CardTitle>
                  <CardDescription>How often you want to receive reminders</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="480"
                      value={localTimeoutInterval.value}
                      onChange={(e) =>
                        setLocalTimeoutInterval({
                          ...localTimeoutInterval,
                          value: Math.max(1, Math.min(480, Number.parseInt(e.target.value) || 1)),
                        })
                      }
                      className="flex-1 border border-input"
                    />
                    <Select
                      value={localTimeoutInterval.unit}
                      onValueChange={(value) => setLocalTimeoutInterval({ ...localTimeoutInterval, unit: value })}
                    >
                      <SelectTrigger className="w-32 border border-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {!isValidInterval() && (
                    <p className="text-sm text-destructive mt-2">
                      Interval must be between 1 and 480 {localTimeoutInterval.unit}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6 mt-6">
              {/* Notifications Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Push Notifications
                  </CardTitle>
                  <CardDescription>Manage how you receive timeout reminders</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="notifications-toggle">Enable Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive browser notifications for reminders</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!canEnableNotifications && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Notifications not supported in this browser</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <Switch
                        id="notifications-toggle"
                        checked={notificationsEnabled}
                        onCheckedChange={onNotificationToggle}
                        disabled={!canEnableNotifications}
                      />
                    </div>
                  </div>

                  {!notificationsEnabled && canEnableNotifications && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Enable notifications to receive timeout reminders even when the app is in the background
                      </p>
                    </div>
                  )}

                  {notificationsEnabled && (
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <p className="text-sm text-primary font-medium">Notifications Active</p>
                      <p className="text-sm text-muted-foreground">
                        You'll receive reminders with sound and vibration (if supported)
                      </p>
                    </div>
                  )}

                  {/* Push Subscription Management */}
                  {notificationsEnabled && pushSubscription && (
                    <div className="space-y-4 pt-4 border-t border-border">
                      <div>
                        <Label className="text-sm font-medium">Push Subscription Status</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Manage your push notification subscription
                        </p>
                      </div>

                      <div className="space-y-3">
                        {/* Subscription Status */}
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            {pushSubscription.isSubscribed ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="text-sm font-medium">
                              {pushSubscription.isSubscribed ? "Subscribed" : "Not Subscribed"}
                            </span>
                          </div>
                          {pushSubscription.isLoading && (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          )}
                        </div>

                        {/* Error Display */}
                        {pushSubscription.error && (
                          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-destructive">Subscription Error</p>
                              <p className="text-xs text-muted-foreground break-words">
                                {pushSubscription.error}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={pushSubscription.clearError}
                                className="mt-2 h-7 text-xs"
                              >
                                Clear Error
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Reset Button */}
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetSubscription}
                            disabled={isResettingSubscription || pushSubscription.isLoading}
                            className="w-full flex items-center gap-2"
                          >
                            <RotateCcw className={`h-4 w-4 ${isResettingSubscription ? 'animate-spin' : ''}`} />
                            {isResettingSubscription ? 'Resetting...' : 'Reset Push Subscription'}
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            Reset if notifications stop working. This will unsubscribe and resubscribe to push notifications.
                          </p>
                        </div>

                        {/* Troubleshooting Info */}
                        {!pushSubscription.isSubscribed && (
                          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                            <div className="flex items-start gap-2">
                              <Info className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                                  Troubleshooting Tips
                                </p>
                                <ul className="text-xs text-orange-700 dark:text-orange-300 mt-1 space-y-1">
                                  <li>• Make sure notifications are enabled in browser settings</li>
                                  <li>• Try refreshing the page and enabling notifications again</li>
                                  <li>• Check if your browser supports push notifications</li>
                                  <li>• Clear browser cache and cookies if issues persist</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
