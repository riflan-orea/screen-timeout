"use client"

import { useState, useEffect, useCallback } from "react"
import { useServiceWorker } from "./use-service-worker"

interface PushSubscriptionState {
  isSubscribed: boolean
  subscription: PushSubscription | null
  isSupported: boolean
  isLoading: boolean
  error: string | null
}

export function usePushSubscription() {
  const [state, setState] = useState<PushSubscriptionState>({
    isSubscribed: false,
    subscription: null,
    isSupported: false,
    isLoading: false,
    error: null,
  })

  const { isSupported: swSupported, isRegistered: swRegistered } = useServiceWorker()

  // Check if push notifications are supported
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setState(prev => ({ ...prev, isSupported }))
  }, [])

  // Check existing subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!state.isSupported || !swRegistered) return

      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }))
        
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        
        setState(prev => ({
          ...prev,
          isSubscribed: !!subscription,
          subscription: subscription,
          isLoading: false
        }))
      } catch (error) {
        console.error('Error checking push subscription:', error)
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to check subscription'
        }))
      }
    }

    if (swRegistered) {
      checkSubscription()
    }
  }, [state.isSupported, swRegistered])

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !swRegistered) {
      setState(prev => ({ ...prev, error: 'Push notifications not supported' }))
      return false
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const registration = await navigator.serviceWorker.ready
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription()
      if (existingSubscription) {
        setState(prev => ({
          ...prev,
          isSubscribed: true,
          subscription: existingSubscription,
          isLoading: false
        }))
        return true
      }

      // Create new subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: null // For demo purposes, you'd typically have a VAPID key here
      })

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        subscription: subscription,
        isLoading: false
      }))

      // Store subscription info in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('pushSubscriptionActive', 'true')
        localStorage.setItem('pushSubscriptionTime', Date.now().toString())
      }

      return true
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe'
      }))
      return false
    }
  }, [state.isSupported, swRegistered])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.subscription) {
      return true
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const success = await state.subscription.unsubscribe()
      
      if (success) {
        setState(prev => ({
          ...prev,
          isSubscribed: false,
          subscription: null,
          isLoading: false
        }))

        // Clear subscription info from localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pushSubscriptionActive')
          localStorage.removeItem('pushSubscriptionTime')
        }
      }

      return success
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe'
      }))
      return false
    }
  }, [state.subscription])

  // Reset subscription (unsubscribe then resubscribe)
  const resetSubscription = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      // First unsubscribe if currently subscribed
      if (state.isSubscribed && state.subscription) {
        await unsubscribe()
      }

      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 500))

      // Then resubscribe
      const success = await subscribe()
      
      return success
    } catch (error) {
      console.error('Error resetting push subscription:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to reset subscription'
      }))
      return false
    }
  }, [state.isSubscribed, state.subscription, unsubscribe, subscribe])

  // Get subscription info for debugging
  const getSubscriptionInfo = useCallback(() => {
    if (!state.subscription) return null

    try {
      return {
        endpoint: state.subscription.endpoint,
        keys: {
          p256dh: state.subscription.getKey('p256dh') ? 
            btoa(String.fromCharCode(...new Uint8Array(state.subscription.getKey('p256dh')!))) : null,
          auth: state.subscription.getKey('auth') ? 
            btoa(String.fromCharCode(...new Uint8Array(state.subscription.getKey('auth')!))) : null,
        },
        expirationTime: state.subscription.expirationTime
      }
    } catch (error) {
      console.error('Error getting subscription info:', error)
      return null
    }
  }, [state.subscription])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    isSupported: state.isSupported,
    isSubscribed: state.isSubscribed,
    subscription: state.subscription,
    isLoading: state.isLoading,
    error: state.error,
    subscribe,
    unsubscribe,
    resetSubscription,
    getSubscriptionInfo,
    clearError,
  }
}