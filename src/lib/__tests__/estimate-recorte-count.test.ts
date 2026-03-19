import { describe, expect, it, vi } from 'vitest'
import type { Recorte } from '@/types/clipping'

const mockSearch = vi.fn()
vi.mock('@/services/typesense/client', () => ({
  typesense: {
    collections: () => ({
      documents: () => ({
        search: mockSearch,
      }),
    }),
  },
}))

import { buildFilterBy, estimateRecorteCount } from '../estimate-recorte-count'

function recorte(overrides: Partial<Omit<Recorte, 'id'>> = {}): Recorte {
  return { id: 'r1', themes: [], agencies: [], keywords: [], ...overrides }
}

describe('buildFilterBy', () => {
  it('always includes published_at timestamp', () => {
    const result = buildFilterBy(recorte(), 1700000000)
    expect(result).toContain('published_at:>=1700000000')
  })

  describe('agency filter', () => {
    it('uses "agency" field (not "agency_key")', () => {
      const result = buildFilterBy(recorte({ agencies: ['mec'] }), 0)
      expect(result).toContain('agency:=mec')
      expect(result).not.toContain('agency_key')
    })

    it('joins multiple agencies with OR', () => {
      const result = buildFilterBy(
        recorte({ agencies: ['mec', 'ms', 'mf'] }),
        0,
      )
      expect(result).toContain('agency:=mec')
      expect(result).toContain('agency:=ms')
      expect(result).toContain('agency:=mf')
      expect(result).toContain(' || ')
    })

    it('omits agency filter when agencies is empty', () => {
      const result = buildFilterBy(recorte({ agencies: [] }), 0)
      expect(result).not.toContain('agency')
    })
  })

  describe('theme filter', () => {
    it('matches theme code at L1, L2 and L3', () => {
      const result = buildFilterBy(recorte({ themes: ['08'] }), 0)
      expect(result).toContain('theme_1_level_1_code:=08')
      expect(result).toContain('theme_1_level_2_code:=08')
      expect(result).toContain('theme_1_level_3_code:=08')
    })

    it('escapes dots in L2/L3 theme codes', () => {
      const result = buildFilterBy(recorte({ themes: ['08.01'] }), 0)
      expect(result).toContain('08\\.01')
      expect(result).not.toMatch(/theme[^:]*:=08\.01[^\\]/)
    })

    it('joins multiple themes with OR', () => {
      const result = buildFilterBy(recorte({ themes: ['08', '16'] }), 0)
      expect(result).toContain(' || ')
    })

    it('omits theme filter when themes is empty', () => {
      const result = buildFilterBy(recorte({ themes: [] }), 0)
      expect(result).not.toContain('theme')
    })
  })

  describe('combined filters', () => {
    it('combines theme and agency with AND', () => {
      const result = buildFilterBy(
        recorte({ themes: ['08'], agencies: ['mec'] }),
        1000,
      )
      expect(result).toContain('published_at:>=1000')
      expect(result).toContain('theme_1_level_1_code:=08')
      expect(result).toContain('agency:=mec')
      // All parts joined with &&
      const parts = result.split(' && ')
      expect(parts.length).toBeGreaterThanOrEqual(3)
    })

    it('no optional filters — only timestamp', () => {
      const result = buildFilterBy(recorte(), 42)
      expect(result).toBe('published_at:>=42')
    })
  })
})

describe('estimateRecorteCount', () => {
  it('returns 0 for empty recorte without calling Typesense', async () => {
    mockSearch.mockClear()
    const count = await estimateRecorteCount(recorte())
    expect(count).toBe(0)
    expect(mockSearch).not.toHaveBeenCalled()
  })

  it('calls Typesense when recorte has theme filter', async () => {
    mockSearch.mockResolvedValue({ found: 42 })
    const count = await estimateRecorteCount(recorte({ themes: ['08'] }))
    expect(count).toBe(42)
    expect(mockSearch).toHaveBeenCalled()
  })

  it('calls Typesense when recorte has agency filter', async () => {
    mockSearch.mockResolvedValue({ found: 10 })
    const count = await estimateRecorteCount(recorte({ agencies: ['mec'] }))
    expect(count).toBe(10)
  })

  it('calls Typesense when recorte has keyword filter', async () => {
    mockSearch.mockResolvedValue({ found: 5 })
    const count = await estimateRecorteCount(
      recorte({ keywords: ['educação'] }),
    )
    expect(count).toBe(5)
  })
})
