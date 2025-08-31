"use client"

import { useState, useEffect } from "react"
import { Download, Smartphone, Monitor, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

export function PWAInstallHandler() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [platform, setPlatform] = useState<string>("")
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase()
    const isIOS = /ipad|iphone|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isAndroid = /android/.test(userAgent)
    const isMobile = /mobile|tablet|android|ipad|iphone|ipod/.test(userAgent)
    
    if (isIOS) {
      setPlatform("iOS")
    } else if (isAndroid) {
      setPlatform("Android")
    } else if (isMobile) {
      setPlatform("Mobile")
    } else {
      setPlatform("Desktop")
    }

    // Check installation status
    const checkInstallStatus = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches
      const inApp = (window.navigator as any).standalone === true
      const fullscreen = window.matchMedia('(display-mode: fullscreen)').matches
      const minimalUI = window.matchMedia('(display-mode: minimal-ui)').matches
      const installed = standalone || inApp || fullscreen || minimalUI
      
      setIsInstalled(installed)
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

    // For iOS, show instructions instead of waiting for prompt
    if (isIOS && !isInstalled) {
      setShowInstructions(true)
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

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setIsInstalled(true)
        setCanInstall(false)
      }
    } catch (error) {
      console.error('Install prompt failed:', error)
    }

    setDeferredPrompt(null)
  }

  const handleShowInstructions = () => {
    setShowInstructions(true)
  }

  if (isInstalled) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
        <Smartphone className="h-4 w-4 text-green-600" />
        <AlertDescription className="flex items-center gap-2">
          <span>App installed successfully!</span>
          <Badge variant="secondary" className="text-xs">
            {platform}
          </Badge>
        </AlertDescription>
      </Alert>
    )
  }

  if (platform === "iOS" && showInstructions) {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <div className="space-y-2">
            <div className="font-medium">To install on iOS:</div>
            <div className="text-sm space-y-1">
              <div>1. Tap the Share button in Safari</div>
              <div>2. Select "Add to Home Screen"</div>
              <div>3. Tap "Add" to install</div>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  if (canInstall) {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
        <Download className="h-4 w-4 text-blue-600" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Install this app for better performance</span>
            <Badge variant="secondary" className="text-xs">
              {platform}
            </Badge>
          </div>
          <Button size="sm" onClick={handleInstallClick}>
            Install
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (platform === "iOS") {
    return (
      <Alert>
        <Smartphone className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>This app can be installed on your device</span>
          <Button size="sm" variant="outline" onClick={handleShowInstructions}>
            How to Install
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return null
}