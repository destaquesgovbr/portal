/**
 * Testes das server actions de detalhe de artigo (Fase 2B — Typesense → GraphQL).
 *
 * Mockamos o facade `@/services/content`, `createSSRClient` e a enriquecimento
 * de agência (`getAgencyField`) para asserir o tratamento de erro (`Result`),
 * o enrich de nome de agência e o repasse a `getRelatedArticles`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContentService } from '@/services/content'
import type { ArticleRow } from '@/types/article'

const getArticle = vi.fn()
const getRelatedArticles = vi.fn()
const getAgencyField = vi.fn()

const fakeService = {
  getArticle,
  getRelatedArticles,
} as unknown as ContentService

vi.mock('@/lib/graphql/client', () => ({
  createSSRClient: vi.fn(() => ({}) as unknown),
}))

vi.mock('@/services/content', () => ({
  getContentService: vi.fn(() => fakeService),
}))

vi.mock('@/data/agencies-utils', () => ({
  getAgencyField: (...args: unknown[]) => getAgencyField(...args),
}))

import { getArticleById, getSimilarArticles } from '../actions'

function row(overrides: Partial<ArticleRow> = {}): ArticleRow {
  return {
    unique_id: 'a-1',
    title: 'Título',
    agency: 'min-saude',
    published_at: 1000,
    ...overrides,
  } as ArticleRow
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getArticleById', () => {
  it('retorna ok com nome de agência enriquecido', async () => {
    getArticle.mockResolvedValue(row({ agency: 'min-saude' }))
    getAgencyField.mockResolvedValue('Ministério da Saúde')

    const result = await getArticleById('a-1')

    expect(getArticle).toHaveBeenCalledWith('a-1')
    expect(getAgencyField).toHaveBeenCalledWith('min-saude', 'name')
    expect(result.type).toBe('ok')
    if (result.type === 'ok') {
      expect(result.data.agency).toBe('Ministério da Saúde')
      expect(result.data.unique_id).toBe('a-1')
    }
  })

  it('faz fallback do nome de agência quando getAgencyField não resolve', async () => {
    getArticle.mockResolvedValue(row())
    getAgencyField.mockResolvedValue(undefined)

    const result = await getArticleById('a-1')
    expect(result.type).toBe('ok')
    if (result.type === 'ok') {
      expect(result.data.agency).toBe('Órgão público federal')
    }
  })

  it('retorna err not_found quando o artigo não existe', async () => {
    getArticle.mockResolvedValue(null)

    const result = await getArticleById('missing')
    expect(result.type).toBe('err')
    if (result.type === 'err') {
      expect(result.error).toBe('not_found')
    }
  })

  it('retorna err db_error quando o facade lança', async () => {
    getArticle.mockRejectedValue(new Error('network'))

    const result = await getArticleById('a-1')
    expect(result.type).toBe('err')
    if (result.type === 'err') {
      expect(result.error).toBe('db_error')
    }
  })
})

describe('getSimilarArticles', () => {
  it('repassa para getRelatedArticles com unique_id e limit', async () => {
    const related = [row({ unique_id: 'b-1' })]
    getRelatedArticles.mockResolvedValue(related)

    const out = await getSimilarArticles(row({ unique_id: 'a-1' }), 6)

    expect(getRelatedArticles).toHaveBeenCalledWith('a-1', 6)
    expect(out).toBe(related)
  })

  it('usa limit default 4', async () => {
    getRelatedArticles.mockResolvedValue([])
    await getSimilarArticles(row({ unique_id: 'a-1' }))
    expect(getRelatedArticles).toHaveBeenCalledWith('a-1', 4)
  })
})
