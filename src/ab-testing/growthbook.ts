import { GrowthBook } from '@growthbook/growthbook-react'
import { trackExperimentViewed } from './tracking'

const API_HOST = process.env.NEXT_PUBLIC_GROWTHBOOK_API_HOST || ''
const CLIENT_KEY = process.env.NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY || ''

/**
 * Creates a new GrowthBook instance
 * Each request should have its own instance for proper SSR support
 */
export function createGrowthBookInstance() {
  const gb = new GrowthBook({
    apiHost: API_HOST,
    clientKey: CLIENT_KEY,
    // Enable DevTools in development
    enableDevMode: process.env.NODE_ENV === 'development',
    // Track experiment exposures for analytics
    trackingCallback: (experiment, result) => {
      trackExperimentViewed(experiment.key, result.key)
    },
  })

  return gb
}

/**
 * Check if GrowthBook is configured
 */
export function isGrowthBookConfigured(): boolean {
  return Boolean(API_HOST && CLIENT_KEY)
}
