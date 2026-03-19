'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Recorte } from '@/types/clipping'

type EstimationResult = {
  total: number
  perRecorte: number[]
  loading: boolean
  error: string | null
}

export function useRecorteEstimation(recortes: Recorte[]): EstimationResult {
  const [total, setTotal] = useState(0)
  const [perRecorte, setPerRecorte] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchEstimation = useCallback(async (recortes: Recorte[]) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const hasAnyFilter = recortes.some(
      (r) =>
        r.themes.length > 0 || r.agencies.length > 0 || r.keywords.length > 0,
    )

    if (!hasAnyFilter) {
      setTotal(0)
      setPerRecorte([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/clipping/estimate?recortes=${encodeURIComponent(JSON.stringify(recortes))}`,
        { signal: controller.signal },
      )

      if (!response.ok) {
        throw new Error('Erro ao buscar estimativa')
      }

      const data = await response.json()
      setTotal(data.total)
      setPerRecorte(data.perRecorte)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return { total, perRecorte, loading, error }
}
