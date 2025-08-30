"use client"

import { useState, useEffect } from "react"
import { Bell, Info } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

interface NotificationDialogProps {
  notificationsEnabled: boolean
  onNotificationToggle: (enabled: boolean) => void
  hasBackgroundSupport?: boolean
}

export function NotificationDialog({
  notificationsEnabled,
  onNotificationToggle,
  hasBackgroundSupport = false,
}: NotificationDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [canEnableNotifications, setCanEnableNotifications] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCanEnableNotifications("Notification" in window)
    }
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notificationsEnabled && (
            <Badge 
              variant="default" 
              className="absolute -top-1 -right-1 h-3 w-3 p-0 flex items-center justify-center text-xs"
            >
              <span className="sr-only">Notifications enabled</span>
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </DialogTitle>
          <DialogDescription>Manage how you receive timeout reminders</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Push Notifications
                {hasBackgroundSupport && (
                  <Badge variant="outline" className="text-xs ml-2">
                    Background Support
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Receive browser notifications for reminders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="notifications-toggle">Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">Get reminders even when the app is minimized</p>
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
                    {hasBackgroundSupport && " • Works even when app is closed"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}