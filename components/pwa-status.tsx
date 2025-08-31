"use client"

import { useState, useEffect } from "react"
import { Download, CheckCircle, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

export function PWAStatus() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if app is already installed
    const checkInstallStatus = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches
      const inApp = (window.navigator as any).standalone === true
      const fullscreen = window.matchMedia('(display-mode: fullscreen)').matches
      const minimalUI = window.matchMedia('(display-mode: minimal-ui)').matches
      const installed = standalone || inApp || fullscreen || minimalUI
      
      setIsInstalled(installed)
      setIsStandalone(standalone)
    }

    checkInstallStatus()

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setCanInstall(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setIsInstalled(true)
      setCanInstall(false)
    }

    setDeferredPrompt(null)
  }

  if (isInstalled) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-base">App Installed</CardTitle>
            <Badge variant="secondary" className="text-xs">
              <Smartphone className="h-3 w-3 mr-1" />
              PWA
            </Badge>
          </div>
          <CardDescription>
            {isStandalone 
              ? "Running as a standalone app with full PWA features"
              : "App is installed and ready to use"
            }
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (canInstall) {
    return (
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Install Available</CardTitle>
            <Badge variant="secondary" className="text-xs">
              <Smartphone className="h-3 w-3 mr-1" />
              PWA
            </Badge>
          </div>
          <CardDescription>
            Install this app for offline access and better experience
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Button onClick={handleInstallClick} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Install App
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-gray-600" />
          <CardTitle className="text-base">PWA Ready</CardTitle>
          <Badge variant="secondary" className="text-xs">
            <Smartphone className="h-3 w-3 mr-1" />
            PWA
          </Badge>
        </div>
        <CardDescription>
          This app supports PWA installation. Look for the install option in your browser.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
