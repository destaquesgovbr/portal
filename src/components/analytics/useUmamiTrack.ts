'use client'

import { useCallback } from 'react'
import type { WindowWithAnalytics } from '@/types/analytics'

/**
 * Hook to track custom events with Umami Analytics
 *
 * @returns Object with track function
 *
 * @example
 * const { track } = useUmamiTrack()
 *
 * // Track search event
 * track('search', { query: 'governo', results_count: 42 })
 *
 * // Track article click
 * track('article_click', { article_id: '123', origin: 'home' })
 */
export function useUmamiTrack() {
  const track = useCallback(
    (eventName: string, eventData?: Record<string, unknown>) => {
      if (typeof window === 'undefined') {
        return
      }

      const w = window as WindowWithAnalytics
      if (!w.umami) {
        return
      }

      w.umami.track(eventName, eventData)
    },
    [],
  )

  return { track }
}
