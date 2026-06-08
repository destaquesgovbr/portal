/**
 * Testes da server action `getArticles` do detalhe de órgão (migração Fase 2B).
 *
 * Verifica o mapeamento para `listArticles`: filtro por agência, SEM dedup,
 * temas por código (OR através de L1/L2/L3 resolvido server-side), conversão de
 * datas ms→ISO (endDate +1 dia) e shape `{ articles, page: page + 1 }`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ArticlesPage, ListArticlesArgs } from '@/services/content'
import type { ArticleRow } from '@/types/article'

const listArticlesMock =
  vi.fn<(args?: ListArticlesArgs) => Promise<ArticlesPage>>()

vi.mock('@/lib/graphql/client', () => ({
  createSSRClient: () => ({}) as unknown,
}))

vi.mock('@/services/content', () => ({
  getContentService: () => ({ listArticles: listArticlesMock }),
}))

import { getArticles } from '../actions'

const row = { unique_id: 'a-1' } as ArticleRow

beforeEach(() => {
  listArticlesMock.mockReset()
  listArticlesMock.mockResolvedValue({ articles: [row], found: 1 })
})

describe('getArticles (órgão)', () => {
  it('filtra por agência sem dedup, limit 40, retorna page+1', async () => {
    const result = await getArticles({ agency: 'min-saude', page: 1 })

    expect(listArticlesMock).toHaveBeenCalledTimes(1)
    const args = listArticlesMock.mock.calls[0][0]!
    expect(args.page).toBe(1)
    expect(args.limit).toBe(40)
    expect(args.dedup).toBe(false)
    expect(args.filter?.agencies).toEqual(['min-saude'])
    expect(args.filter?.themes).toBeNull()
    expect(args.filter?.startDate).toBeNull()
    expect(args.filter?.endDate).toBeNull()

    expect(result).toEqual({ articles: [row], page: 2 })
  })

  it('passa temas por código e converte datas ms→ISO (endDate +1 dia)', async () => {
    const start = Date.UTC(2026, 0, 1)
    const end = Date.UTC(2026, 0, 31)

    await getArticles({
      agency: 'min-saude',
      page: 2,
      startDate: start,
      endDate: end,
      themes: ['01', '0101'],
    })

    const args = listArticlesMock.mock.calls[0][0]!
    expect(args.filter?.themes).toEqual(['01', '0101'])
    expect(args.filter?.startDate).toBe(new Date(start).toISOString())
    expect(args.filter?.endDate).toBe(new Date(end + 86400000).toISOString())
  })

  it('temas vazio vira null', async () => {
    await getArticles({ agency: 'min-saude', page: 1, themes: [] })
    expect(listArticlesMock.mock.calls[0][0]!.filter?.themes).toBeNull()
  })
})
