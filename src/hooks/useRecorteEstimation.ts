'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useContentService } from '@/services/content'
import type { Recorte } from '@/types/clipping'

type EstimationResult = {
  total: number
  perRecorte: number[]
  loading: boolean
  error: string | null
}

function hasFilters(recorte: Recorte): boolean {
  return (
    recorte.themes.length > 0 ||
    recorte.agencies.length > 0 ||
    recorte.keywords.length > 0
  )
}

export function useRecorteEstimation(recortes: Recorte[]): EstimationResult {
  const content = useContentService()
  const [total, setTotal] = useState(0)
  const [perRecorte, setPerRecorte] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchEstimation = useCallback(
    async (recortes: Recorte[]) => {
      const hasAnyFilter = recortes.some(hasFilters)

      if (!hasAnyFilter) {
        setTotal(0)
        setPerRecorte([])
        setLoading(false)
        return
      }

      // Discard stale responses: only the latest request may commit state.
      const requestId = ++requestIdRef.current

      setLoading(true)
      setError(null)

      try {
        const counts: number[] = []
        let totalCount = 0
        for (const recorte of recortes) {
          const count = hasFilters(recorte)
            ? await content.estimateRecorteCount({
                themes: recorte.themes,
                agencies: recorte.agencies,
                keywords: recorte.keywords,
                sinceHours: 24,
              })
            : 0
          counts.push(count)
          totalCount += count
        }

        if (requestId !== requestIdRef.current) return

        setTotal(totalCount)
        setPerRecorte(counts)
      } catch (err) {
        if (requestId !== requestIdRef.current) return
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    },
    [content],
  )

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      fetchEstimation(recortes)
    }, 500)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [recortes, fetchEstimation])

  useEffect(() => {
    return () => {
      // Invalidate any in-flight request on unmount.
      requestIdRef.current++
    }
  }, [])

  return { total, perRecorte, loading, error }
}
