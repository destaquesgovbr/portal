'use client'

import {
  useFeatureIsOn,
  useFeatureValue,
  useGrowthBook,
} from '@growthbook/growthbook-react'
import { useCallback } from 'react'
import { useABTestingContext } from './GrowthBookProvider'
import { isGrowthBookConfigured } from './growthbook'

// Cache the configuration check to avoid repeated calls
const IS_CONFIGURED = isGrowthBookConfigured()

/**
 * Hook to get the variant value for an A/B experiment
 *
 * @param experimentKey - The feature/experiment key from GrowthBook
 * @param fallback - Default value if experiment not found (default: 'control')
 * @returns The variant key string
 *
 * @example
 * const variant = useAB('homepage-layout')
 * if (variant === 'variant-a') {
 *   return <NewLayout />
 * }
 * return <ControlLayout />
 */
export function useAB(experimentKey: string, fallback = 'control'): string {
  // Always call the hook unconditionally to satisfy React's rules of hooks
  const value = useFeatureValue(experimentKey, fallback)

  // If GrowthBook not configured, return fallback
  if (!IS_CONFIGURED) {
    return fallback
  }

  return String(value)
}

/**
 * Hook to check if a feature flag is enabled (boolean)
 *
 * @param featureKey - The feature key from GrowthBook
 * @returns true if the feature is enabled, false otherwise
 *
 * @example
 * const showNewSearch = useFeatureFlag('new-search-bar')
 * if (showNewSearch) {
 *   return <NewSearchBar />
 * }
 * return <OldSearchBar />
 */
export function useFeatureFlag(featureKey: string): boolean {
  // Always call the hook unconditionally to satisfy React's rules of hooks
  const isOn = useFeatureIsOn(featureKey)

  // If GrowthBook not configured, feature is always off
  if (!IS_CONFIGURED) {
    return false
  }

  return isOn
}

/**
 * Hook to check if user is in a specific variant
 *
 * @param experimentKey - The experiment key
 * @param variantKey - The variant to check for
 * @returns true if user is in the specified variant
 *
 * @example
 * const isNewLayout = useIsVariant('homepage-layout', 'variant-a')
 */
export function useIsVariant(
  experimentKey: string,
  variantKey: string,
): boolean {
  const currentVariant = useAB(experimentKey)
  return currentVariant === variantKey
}

/**
 * Hook to track conversion events for experiments
 *
 * @param experimentKey - The experiment key to track conversions for
 * @returns A function to call when a conversion happens
 *
 * @example
 * const trackConversion = useABConversion('homepage-layout')
 * <Button onClick={() => {
 *   trackConversion('cta-clicked')
 *   // ... rest of handler
 * }}>
 *   Click me
 * </Button>
 */
export function useABConversion(
  experimentKey: string,
): (conversionName: string) => void {
  const { trackConversion } = useABTestingContext()

  return useCallback(
    (conversionName: string) => {
      trackConversion(experimentKey, conversionName)
    },
    [experimentKey, trackConversion],
  )
}

/**
 * Hook to access the GrowthBook instance directly
 * Use this for advanced use cases not covered by other hooks
 *
 * @returns The GrowthBook instance or null if not ready/configured
 */
export function useGrowthBookInstance() {
  // Always call the hook unconditionally to satisfy React's rules of hooks
  const growthbook = useGrowthBook()

  // If GrowthBook not configured, return null
  if (!IS_CONFIGURED) {
    return null
  }

  return growthbook
}
