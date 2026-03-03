import type { WindowWithAnalytics as BaseWindowWithAnalytics } from '@/types/analytics'

type ClarityFunction = (method: string, key: string, value: string) => void

interface WindowWithAnalytics extends BaseWindowWithAnalytics {
  clarity?: ClarityFunction
}

// Track which experiments have been exposed to prevent duplicate tracking
const exposedExperiments = new Set<string>()

/**
 * Track experiment exposure to analytics platforms
 * Called automatically by GrowthBook when a user is exposed to an experiment
 */
export function trackExperimentViewed(
  experimentKey: string,
  variantKey: string,
): void {
  // Prevent duplicate tracking for same experiment
  const trackingKey = `${experimentKey}:${variantKey}`
  if (exposedExperiments.has(trackingKey)) {
    return
  }
  exposedExperiments.add(trackingKey)

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[A/B Testing] Exposure: ${experimentKey} -> ${variantKey}`)
  }

  // Skip tracking on server
  if (typeof window === 'undefined') {
    return
  }

  const w = window as WindowWithAnalytics

  // Track with Microsoft Clarity
  if (w.clarity) {
    // Set experiment-specific tag
    w.clarity('set', `ab_${experimentKey}`, variantKey)
    // Set combined exposure event for easier filtering
    w.clarity('set', 'ab_exposure', `${experimentKey}:${variantKey}`)
  }

  // Track with Umami Analytics
  if (w.umami) {
    w.umami.track('experiment_viewed', {
      experiment: experimentKey,
      variant: variantKey,
    })
  }
}

/**
 * Track conversion events for experiments
 * Call this when a user completes a goal (e.g., clicks CTA, submits form)
 */
export function trackConversion(
  experimentKey: string,
  variantKey: string,
  conversionName: string,
): void {
  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[A/B Testing] Conversion: ${experimentKey} (${variantKey}) -> ${conversionName}`,
    )
  }

  // Skip tracking on server
  if (typeof window === 'undefined') {
    return
  }

  const w = window as WindowWithAnalytics

  // Track with Microsoft Clarity
  if (w.clarity) {
    w.clarity(
      'set',
      `ab_conv_${experimentKey}`,
      `${variantKey}:${conversionName}`,
    )
    w.clarity('set', 'ab_last_conversion', conversionName)
  }

  // Track with Umami Analytics
  if (w.umami) {
    w.umami.track('experiment_conversion', {
      experiment: experimentKey,
      variant: variantKey,
      conversion: conversionName,
    })
  }
}

/**
 * Clear tracked exposures (useful for testing)
 */
export function clearTrackedExposures(): void {
  exposedExperiments.clear()
}
