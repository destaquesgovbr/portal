'use client'

import {
  GrowthBookProvider as GBProvider,
  type GrowthBook,
} from '@growthbook/growthbook-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { createGrowthBookInstance, isGrowthBookConfigured } from './growthbook'
import { trackConversion as trackConversionToAnalytics } from './tracking'

const AB_USER_ID_COOKIE = 'ab_user_id'
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 // 1 year in seconds

/**
 * Generate a random user ID for A/B testing
 */
function generateUserId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Get cookie value by name (client-side only)
 */
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
  return match ? match[2] : undefined
}

/**
 * Set cookie value (client-side only)
 * Using document.cookie directly as Cookie Store API is not widely supported
 */
function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === 'undefined') return
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API not widely supported yet
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`
}

interface ABTestingContextValue {
  userId: string
  isReady: boolean
  trackConversion: (experimentKey: string, conversionName: string) => void
}

const ABTestingContext = createContext<ABTestingContextValue | undefined>(
  undefined,
)

interface GrowthBookProviderProps {
  children: React.ReactNode
}

export function GrowthBookProvider({ children }: GrowthBookProviderProps) {
  const [growthbook, setGrowthbook] = useState<GrowthBook | null>(null)
  const [userId, setUserId] = useState('')
  const [isReady, setIsReady] = useState(false)

  // Initialize GrowthBook on mount
  useEffect(() => {
    // Check if GrowthBook is configured
    if (!isGrowthBookConfigured()) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[A/B Testing] GrowthBook not configured. Set NEXT_PUBLIC_GROWTHBOOK_API_HOST and NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY environment variables.',
        )
      }
      setIsReady(true)
      return
    }

    // Get or create user ID
    let currentUserId = getCookie(AB_USER_ID_COOKIE)
    if (!currentUserId) {
      currentUserId = generateUserId()
      setCookie(AB_USER_ID_COOKIE, currentUserId, COOKIE_MAX_AGE)
    }
    setUserId(currentUserId)

    // Create and configure GrowthBook instance
    const gb = createGrowthBookInstance()

    // Set user attributes for targeting
    gb.setAttributes({
      id: currentUserId,
      // Add more attributes for targeting as needed:
      // browser: navigator.userAgent,
      // url: window.location.href,
    })

    // Load features from GrowthBook API
    gb.init({ streaming: true })
      .then(() => {
        setGrowthbook(gb)
        setIsReady(true)
      })
      .catch((error) => {
        console.error('[A/B Testing] Failed to load features:', error)
        setIsReady(true)
      })

    // Cleanup on unmount
    return () => {
      gb.destroy()
    }
  }, [])

  const trackConversion = useCallback(
    (experimentKey: string, conversionName: string) => {
      if (!growthbook) return

      // Get the current variant for this experiment
      const result = growthbook.getFeatureValue(experimentKey, 'control')
      trackConversionToAnalytics(experimentKey, String(result), conversionName)
    },
    [growthbook],
  )

  const contextValue = useMemo<ABTestingContextValue>(
    () => ({
      userId,
      isReady,
      trackConversion,
    }),
    [userId, isReady, trackConversion],
  )

  // If GrowthBook is not configured, render children without provider
  if (!isGrowthBookConfigured()) {
    return (
      <ABTestingContext.Provider value={contextValue}>
        {children}
      </ABTestingContext.Provider>
    )
  }

  // If GrowthBook is configured but not ready, still render children
  // This prevents hydration issues and allows the page to render
  if (!growthbook) {
    return (
      <ABTestingContext.Provider value={contextValue}>
        {children}
      </ABTestingContext.Provider>
    )
  }

  return (
    <ABTestingContext.Provider value={contextValue}>
      <GBProvider growthbook={growthbook}>{children}</GBProvider>
    </ABTestingContext.Provider>
  )
}

export function useABTestingContext(): ABTestingContextValue {
  const context = useContext(ABTestingContext)
  if (context === undefined) {
    throw new Error(
      'useABTestingContext must be used within a GrowthBookProvider',
    )
  }
  return context
}
