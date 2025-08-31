"use client"

import { useState, useEffect } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
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
    }

    checkInstallStatus()
    
    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    mediaQuery.addEventListener('change', checkInstallStatus)

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
      const mediaQuery = window.matchMedia('(display-mode: standalone)')
      mediaQuery.removeEventListener('change', checkInstallStatus)
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

  // Don't show if already installed or can't install
  if (isInstalled || !canInstall) {
    return null
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleInstallClick}
      className="flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Install</span>
    </Button>
  )
}
