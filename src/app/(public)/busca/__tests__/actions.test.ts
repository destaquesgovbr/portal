/**
 * Testes das server actions de busca (Fase 2B — migração Typesense → GraphQL).
 *
 * Mockamos o facade `@/services/content` e o `createSSRClient` para asserir
 * o mapeamento de argumentos e a preservação dos formatos de retorno, sem
 * tocar no GraphQL real.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContentService } from '@/services/content'
import type { ArticleRow } from '@/types/article'

// ---------- Mocks ----------

const searchArticles = vi.fn()
const getSearchSuggestions = vi.fn()

const fakeService = {
  searchArticles,
  getSearchSuggestions,
} as unknown as ContentService

vi.mock('@/lib/graphql/client', () => ({
  createSSRClient: vi.fn(() => ({}) as unknown),
}))

vi.mock('@/services/content/graphql', () => ({
  createGraphQLContentService: vi.fn(() => fakeService),
}))

// removeDiacritics é usado pela derivação de autocomplete — usamos o real.

import {
  getCombinedSearchResults,
  getInlineAutocompleteSuggestion,
  getSearchSuggestions as getSearchSuggestionsAction,
  queryArticles,
} from '../actions'

function row(overrides: Partial<ArticleRow> = {}): ArticleRow {
  return {
    unique_id: 'a-1',
    title: 'Título',
    agency: 'ag',
    published_at: 1000,
  } as ArticleRow
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('queryArticles', () => {
  it('mapeia para searchArticles com semantic+alpha:0.8+dedup e filtros', async () => {
    searchArticles.mockResolvedValue({
      articles: [row()],
      found: 5,
      page: 2,
    })

    const result = await queryArticles({
      query: '  inteligência   artificial ',
      page: 2,
      startDate: 1_700_000_000_000,
      endDate: 1_700_086_400_000,
      agencies: ['min-a'],
      themes: ['01'],
    })

    expect(searchArticles).toHaveBeenCalledTimes(1)
    const arg = searchArticles.mock.calls[0][0]
    expect(arg.query).toBe('inteligência artificial')
    expect(arg.page).toBe(2)
    expect(arg.semantic).toBe(true)
    expect(arg.alpha).toBe(0.8)
    expect(arg.dedup).toBe(true)
    expect(arg.filter.agencies).toEqual(['min-a'])
    expect(arg.filter.themes).toEqual(['01'])
    // endDate é exclusivo do dia seguinte (+ 86.400.000 ms)
    expect(arg.filter.startDate).toBe(new Date(1_700_000_000_000).toISOString())
    expect(arg.filter.endDate).toBe(
      new Date(1_700_086_400_000 + 86_400_000).toISOString(),
    )

    // Contrato preservado: page é o cursor da PRÓXIMA página (page + 1)
    expect(result).toEqual({
      articles: [row()],
      page: 3,
      found: 5,
    })
  })

  it('passa filtros nulos e query vazia quando não fornecidos; semantic default true', async () => {
    searchArticles.mockResolvedValue({ articles: [], found: 0, page: 1 })

    const result = await queryArticles({ page: 1 })

    const arg = searchArticles.mock.calls[0][0]
    expect(arg.query).toBe('')
    expect(arg.semantic).toBe(true)
    expect(arg.filter.agencies).toBeNull()
    expect(arg.filter.themes).toBeNull()
    expect(arg.filter.startDate).toBeNull()
    expect(arg.filter.endDate).toBeNull()
    expect(result.page).toBe(2)
  })

  it('respeita semantic:false explícito', async () => {
    searchArticles.mockResolvedValue({ articles: [], found: 0, page: 1 })
    await queryArticles({ page: 1, query: 'x', semantic: false })
    expect(searchArticles.mock.calls[0][0].semantic).toBe(false)
  })

  it('usa wildcard "*" quando não há texto mas há filtro (entidade)', async () => {
    searchArticles.mockResolvedValue({ articles: [], found: 0, page: 1 })
    await queryArticles({ page: 1, entities: ['Geraldo Alckmin'] })
    const arg = searchArticles.mock.calls[0][0]
    expect(arg.query).toBe('*')
    expect(arg.filter.entities).toEqual(['Geraldo Alckmin'])
  })

  it('usa wildcard "*" quando não há texto mas há filtro (agência/sentimento)', async () => {
    searchArticles.mockResolvedValue({ articles: [], found: 0, page: 1 })
    await queryArticles({
      page: 1,
      agencies: ['min-a'],
      sentiment: ['positive'],
    })
    expect(searchArticles.mock.calls[0][0].query).toBe('*')
  })

  it('mantém query vazia quando não há texto NEM filtro algum', async () => {
    searchArticles.mockResolvedValue({ articles: [], found: 0, page: 1 })
    await queryArticles({ page: 1 })
    expect(searchArticles.mock.calls[0][0].query).toBe('')
  })

  it('prioriza o texto sobre o wildcard quando há texto E filtro', async () => {
    searchArticles.mockResolvedValue({ articles: [], found: 0, page: 1 })
    await queryArticles({
      page: 1,
      query: 'governo',
      entities: ['Geraldo Alckmin'],
    })
    expect(searchArticles.mock.calls[0][0].query).toBe('governo')
  })
})

describe('getSearchSuggestions', () => {
  it('retorna [] para query curta sem chamar o facade', async () => {
    expect(await getSearchSuggestionsAction('a')).toEqual([])
    expect(getSearchSuggestions).not.toHaveBeenCalled()
  })

  it('mapeia uniqueId→unique_id e limita a 7', async () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      uniqueId: `id-${i}`,
      title: `Título ${i}`,
    }))
    getSearchSuggestions.mockResolvedValue(many)

    const out = await getSearchSuggestionsAction('inteligencia')

    expect(getSearchSuggestions).toHaveBeenCalledWith('inteligencia')
    expect(out).toHaveLength(7)
    expect(out[0]).toEqual({ unique_id: 'id-0', title: 'Título 0' })
  })

  it('retorna [] em erro do facade', async () => {
    getSearchSuggestions.mockRejectedValue(new Error('boom'))
    expect(await getSearchSuggestionsAction('teste')).toEqual([])
  })
})

describe('getInlineAutocompleteSuggestion', () => {
  it('deriva completude da última palavra a partir dos títulos das sugestões', async () => {
    getSearchSuggestions.mockResolvedValue([
      { uniqueId: '1', title: 'Diplomacia brasileira avança' },
    ])

    const out = await getInlineAutocompleteSuggestion('Diplo')

    expect(getSearchSuggestions).toHaveBeenCalledWith('Diplo')
    expect(out).toEqual({ completion: 'Diplomacia', suffix: 'macia' })
  })

  it('respeita palavras anteriores na frase', async () => {
    getSearchSuggestions.mockResolvedValue([
      { uniqueId: '1', title: 'Inteligência artificial no governo' },
      { uniqueId: '2', title: 'Saúde pública nacional' },
    ])

    const out = await getInlineAutocompleteSuggestion('Inteligência art')

    expect(out).toEqual({
      completion: 'Inteligência artificial',
      suffix: 'ificial',
    })
  })

  it('retorna null para query curta', async () => {
    expect(await getInlineAutocompleteSuggestion('a')).toBeNull()
  })

  it('retorna null em erro do facade', async () => {
    getSearchSuggestions.mockRejectedValue(new Error('boom'))
    expect(await getInlineAutocompleteSuggestion('diplo')).toBeNull()
  })
})

describe('getCombinedSearchResults', () => {
  it('faz uma única chamada e retorna sugestões (top-7) + autocomplete', async () => {
    const data = [
      { uniqueId: '1', title: 'Diplomacia brasileira' },
      ...Array.from({ length: 9 }, (_, i) => ({
        uniqueId: `x-${i}`,
        title: `Outro ${i}`,
      })),
    ]
    getSearchSuggestions.mockResolvedValue(data)

    const out = await getCombinedSearchResults('Diplo')

    expect(getSearchSuggestions).toHaveBeenCalledTimes(1)
    expect(out.suggestions).toHaveLength(7)
    expect(out.suggestions[0]).toEqual({
      unique_id: '1',
      title: 'Diplomacia brasileira',
    })
    expect(out.inlineAutocomplete).toEqual({
      completion: 'Diplomacia',
      suffix: 'macia',
    })
  })

  it('retorna vazio para query curta', async () => {
    const out = await getCombinedSearchResults('a')
    expect(out).toEqual({ suggestions: [], inlineAutocomplete: null })
    expect(getSearchSuggestions).not.toHaveBeenCalled()
  })

  it('retorna vazio em erro do facade', async () => {
    getSearchSuggestions.mockRejectedValue(new Error('boom'))
    const out = await getCombinedSearchResults('diplo')
    expect(out).toEqual({ suggestions: [], inlineAutocomplete: null })
  })
})
