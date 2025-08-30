"use client"

import { useState, useEffect } from "react"
import { Settings, Clock, Bell, Info } from "lucide-react"
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
}

export function SettingsDialog({
  notificationsEnabled,
  onNotificationToggle,
  activeHours,
  onActiveHoursChange,
  timeoutInterval,
  onTimeoutIntervalChange,
  onTimerReset,
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCanEnableNotifications("Notification" in window)
    }
  }, [])

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
