/**
 * Testes da server action `getArticles` do detalhe de tema (migração Fase 2B).
 *
 * Verifica o mapeamento para `listArticles`: filtro por `themeLabel` (L1 label),
 * `dedup: true`, conversão de datas ms→ISO (endDate +1 dia inclusivo) e o shape
 * de retorno `{ articles, page: page + 1 }`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ArticlesPage, ListArticlesArgs } from '@/services/content'
import type { ArticleRow } from '@/types/article'

const listArticlesMock =
  vi.fn<(args?: ListArticlesArgs) => Promise<ArticlesPage>>()

vi.mock('@/lib/graphql/client', () => ({
  createSSRClient: () => ({}) as unknown,
}))

vi.mock('@/services/content/graphql', () => ({
  createGraphQLContentService: () => ({ listArticles: listArticlesMock }),
}))

import { getArticles } from '../actions'

const row = { unique_id: 'a-1' } as ArticleRow

beforeEach(() => {
  listArticlesMock.mockReset()
  listArticlesMock.mockResolvedValue({ articles: [row], found: 1 })
})

describe('getArticles (tema)', () => {
  it('filtra por themeLabel com dedup e limit 40, retorna page+1', async () => {
    const result = await getArticles({ theme_1_level_1: 'Saúde', page: 1 })

    expect(listArticlesMock).toHaveBeenCalledTimes(1)
    const args = listArticlesMock.mock.calls[0][0]!
    expect(args.page).toBe(1)
    expect(args.limit).toBe(40)
    expect(args.dedup).toBe(true)
    expect(args.filter?.themeLabel).toBe('Saúde')
    expect(args.filter?.startDate).toBeNull()
    expect(args.filter?.endDate).toBeNull()
    expect(args.filter?.agencies).toBeNull()

    expect(result).toEqual({ articles: [row], page: 2 })
  })

  it('converte datas ms→ISO (endDate +1 dia) e passa agencies', async () => {
    const start = Date.UTC(2026, 0, 1)
    const end = Date.UTC(2026, 0, 31)

    await getArticles({
      theme_1_level_1: 'Saúde',
      page: 3,
      startDate: start,
      endDate: end,
      agencies: ['min-saude'],
    })

    const args = listArticlesMock.mock.calls[0][0]!
    expect(args.filter?.startDate).toBe(new Date(start).toISOString())
    expect(args.filter?.endDate).toBe(new Date(end + 86400000).toISOString())
    expect(args.filter?.agencies).toEqual(['min-saude'])
  })

  it('agencies vazio vira null', async () => {
    await getArticles({ theme_1_level_1: 'Saúde', page: 1, agencies: [] })
    expect(listArticlesMock.mock.calls[0][0]!.filter?.agencies).toBeNull()
  })
})
