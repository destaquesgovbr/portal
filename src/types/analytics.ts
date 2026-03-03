/**
 * Analytics type declarations for Umami and other tracking tools
 */

export type UmamiTrackFunction = (
  eventNameOrProps: string | Record<string, unknown>,
  eventData?: Record<string, unknown>,
) => void

export interface WindowWithAnalytics extends Window {
  umami?: {
    track: UmamiTrackFunction
  }
}

/**
 * Valid tracking origins for article clicks
 */
export type TrackingOrigin = 'home' | 'search' | 'theme' | 'agency' | 'articles'
