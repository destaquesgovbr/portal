import { describe, expect, it } from 'vitest'
import { buildRecortePreviewUrl } from '../recorte-preview-url'

describe('buildRecortePreviewUrl', () => {
  it('returns null for recorte with no filters', () => {
    const recorte = { id: '1', themes: [], agencies: [], keywords: [] }
    expect(buildRecortePreviewUrl(recorte)).toBeNull()
  })

  it('builds URL with themes only', () => {
    const recorte = {
      id: '1',
      themes: ['01', '02'],
      agencies: [],
      keywords: [],
    }
    const url = buildRecortePreviewUrl(recorte)
    expect(url).toBe('/busca?temas=01%2C02')
  })

  it('builds URL with agencies only', () => {
    const recorte = {
      id: '1',
      themes: [],
      agencies: ['saude', 'educacao'],
      keywords: [],
    }
    const url = buildRecortePreviewUrl(recorte)
    expect(url).toBe('/busca?agencias=saude%2Ceducacao')
  })

  it('builds URL with keywords only', () => {
    const recorte = {
      id: '1',
      themes: [],
      agencies: [],
      keywords: ['vacina', 'covid'],
    }
    const url = buildRecortePreviewUrl(recorte)
    expect(url).toBe('/busca?q=vacina%2Bcovid')
  })

  it('builds URL with all filters combined', () => {
    const recorte = {
      id: '1',
      themes: ['01'],
      agencies: ['saude'],
      keywords: ['vacina'],
    }
    const url = buildRecortePreviewUrl(recorte)
    expect(url).toContain('temas=01')
    expect(url).toContain('agencias=saude')
    expect(url).toContain('q=vacina')
    expect(url?.startsWith('/busca?')).toBe(true)
  })
})
