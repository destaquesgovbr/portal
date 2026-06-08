import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Recorte } from '@/types/clipping'

const mockEstimateRecorteCount = vi.fn()

vi.mock('@/services/content', () => ({
  useContentService: () => ({
    estimateRecorteCount: mockEstimateRecorteCount,
  }),
}))

import { useRecorteEstimation } from '../useRecorteEstimation'

function recorte(overrides: Partial<Recorte> = {}): Recorte {
  return {
    id: 'r1',
    title: 'Recorte de teste',
    themes: [],
    agencies: [],
    keywords: [],
    ...overrides,
  }
}

beforeEach(() => {
  mockEstimateRecorteCount.mockReset()
})

describe('useRecorteEstimation', () => {
  it('does not call the facade when no recorte has filters', async () => {
    const { result } = renderHook(() => useRecorteEstimation([recorte()]))

    // Wait well past the 500ms debounce window.
    await new Promise((r) => setTimeout(r, 700))

    expect(mockEstimateRecorteCount).not.toHaveBeenCalled()
    expect(result.current.total).toBe(0)
    expect(result.current.perRecorte).toEqual([])
  })

  it('sums per-recorte counts via the facade and skips filterless recortes', async () => {
    mockEstimateRecorteCount.mockResolvedValueOnce(3).mockResolvedValueOnce(4)

    const recortes = [
      recorte({ id: 'a', themes: ['08'] }),
      recorte({ id: 'b' }),
      recorte({ id: 'c', agencies: ['mec'] }),
    ]

    const { result } = renderHook(() => useRecorteEstimation(recortes))

    await waitFor(() => {
      expect(result.current.total).toBe(7)
    })

    expect(result.current.perRecorte).toEqual([3, 0, 4])
    expect(mockEstimateRecorteCount).toHaveBeenCalledTimes(2)
    expect(mockEstimateRecorteCount).toHaveBeenCalledWith({
      themes: ['08'],
      agencies: [],
      keywords: [],
      sinceHours: 24,
    })
  })

  it('never fetches the legacy REST endpoint', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    mockEstimateRecorteCount.mockResolvedValue(1)

    const { result } = renderHook(() =>
      useRecorteEstimation([recorte({ keywords: ['educação'] })]),
    )

    await waitFor(() => {
      expect(result.current.total).toBe(1)
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(mockEstimateRecorteCount).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })

  it('surfaces an error message when the facade rejects', async () => {
    mockEstimateRecorteCount.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() =>
      useRecorteEstimation([recorte({ themes: ['08'] })]),
    )

    await waitFor(() => {
      expect(result.current.error).toBe('boom')
    })
  })
})
