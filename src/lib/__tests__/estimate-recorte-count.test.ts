import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Recorte } from '@/types/clipping'

const mockEstimateRecorteCount = vi.fn()

vi.mock('@/services/content/graphql', () => ({
  createGraphQLContentService: () => ({
    estimateRecorteCount: mockEstimateRecorteCount,
  }),
}))

vi.mock('@/lib/graphql/client', () => ({
  createSSRClient: vi.fn(() => ({})),
}))

import {
  estimateRecorteCount,
  estimateTotalCount,
  hasFilters,
} from '../estimate-recorte-count'

function recorte(overrides: Partial<Omit<Recorte, 'id'>> = {}): Recorte {
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

describe('hasFilters', () => {
  it('is false for an empty recorte', () => {
    expect(hasFilters(recorte())).toBe(false)
  })

  it('is true when any of themes/agencies/keywords is set', () => {
    expect(hasFilters(recorte({ themes: ['08'] }))).toBe(true)
    expect(hasFilters(recorte({ agencies: ['mec'] }))).toBe(true)
    expect(hasFilters(recorte({ keywords: ['educação'] }))).toBe(true)
  })
})

describe('estimateRecorteCount', () => {
  it('returns 0 for empty recorte without calling the facade', async () => {
    const count = await estimateRecorteCount(recorte())
    expect(count).toBe(0)
    expect(mockEstimateRecorteCount).not.toHaveBeenCalled()
  })

  it('delegates to the facade when recorte has a theme filter', async () => {
    mockEstimateRecorteCount.mockResolvedValue(42)
    const count = await estimateRecorteCount(recorte({ themes: ['08'] }))
    expect(count).toBe(42)
    expect(mockEstimateRecorteCount).toHaveBeenCalledWith({
      themes: ['08'],
      agencies: [],
      keywords: [],
      sinceHours: 24,
    })
  })

  it('delegates to the facade when recorte has an agency filter', async () => {
    mockEstimateRecorteCount.mockResolvedValue(10)
    const count = await estimateRecorteCount(recorte({ agencies: ['mec'] }))
    expect(count).toBe(10)
  })

  it('delegates to the facade when recorte has a keyword filter', async () => {
    mockEstimateRecorteCount.mockResolvedValue(5)
    const count = await estimateRecorteCount(
      recorte({ keywords: ['educação'] }),
    )
    expect(count).toBe(5)
  })

  it('forwards a custom sinceHours window', async () => {
    mockEstimateRecorteCount.mockResolvedValue(7)
    await estimateRecorteCount(recorte({ themes: ['08'] }), 48)
    expect(mockEstimateRecorteCount).toHaveBeenCalledWith(
      expect.objectContaining({ sinceHours: 48 }),
    )
  })
})

describe('estimateTotalCount', () => {
  it('sums per-recorte counts and reports each one', async () => {
    mockEstimateRecorteCount.mockResolvedValueOnce(3).mockResolvedValueOnce(4)
    const result = await estimateTotalCount([
      recorte({ themes: ['08'] }),
      recorte({ agencies: ['mec'] }),
    ])
    expect(result).toEqual({ total: 7, perRecorte: [3, 4] })
  })

  it('skips facade calls for recortes without filters', async () => {
    const result = await estimateTotalCount([recorte(), recorte()])
    expect(result).toEqual({ total: 0, perRecorte: [0, 0] })
    expect(mockEstimateRecorteCount).not.toHaveBeenCalled()
  })
})
