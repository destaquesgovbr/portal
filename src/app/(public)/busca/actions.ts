'use server'

import { createSSRClient } from '@/lib/graphql/client'
import { removeDiacritics } from '@/lib/utils'
import { createGraphQLContentService } from '@/services/content/graphql'
import type {
  CombinedSearchResults,
  InlineAutocompleteSuggestion,
  QueryArticlesArgs,
  QueryArticlesResult,
  SearchSuggestion,
} from '@/types/search'

/** Cliente GraphQL público (sem token) para as server actions de busca. */
function content() {
  return createGraphQLContentService(createSSRClient(async () => null))
}

/**
 * Deriva uma sugestão de autocomplete inline a partir de uma lista de títulos.
 * Retorna a completude da palavra que está a ser digitada (não o título inteiro).
 * Ex.: se o usuário digita "Diplo" e um título contém "Diplomacia", sugere "Diplomacia".
 * Comparação insensível a acentos (texto em português).
 */
function deriveInlineAutocomplete(
  normalizedQuery: string,
  titles: string[],
): InlineAutocompleteSuggestion | null {
  const queryWords = normalizedQuery.split(' ')
  const lastWord = queryWords[queryWords.length - 1]

  // Só sugere se a última palavra tem pelo menos 2 caracteres
  if (lastWord.length < 2) return null

  const normalizedLastWord = removeDiacritics(lastWord.toLowerCase())
  const previousWords = queryWords.slice(0, -1)
  const hasPreviousWords = previousWords.length > 0

  for (const title of titles) {
    const normalizedTitle = removeDiacritics(title.toLowerCase())

    // Se há palavras anteriores, o título precisa contê-las
    if (hasPreviousWords) {
      const normalizedPreviousPhrase = removeDiacritics(
        previousWords.join(' ').toLowerCase(),
      )

      if (!normalizedTitle.includes(normalizedPreviousPhrase)) {
        continue
      }
    }

    const titleWords = title.split(/\s+/)

    for (const titleWord of titleWords) {
      // Limpa a palavra do título (remove pontuação no final)
      const cleanTitleWord = titleWord.replace(/[.,;:!?"')\]]+$/, '')
      const normalizedTitleWord = removeDiacritics(cleanTitleWord.toLowerCase())

      // A palavra do título começa com o que o usuário digitou?
      if (
        normalizedTitleWord.startsWith(normalizedLastWord) &&
        normalizedTitleWord.length > normalizedLastWord.length
      ) {
        // Monta a completude: tudo antes da última palavra + a palavra completada
        const prefix = queryWords.slice(0, -1).join(' ')
        const completion = prefix
          ? `${prefix} ${cleanTitleWord}`
          : cleanTitleWord

        // O sufixo é apenas a parte restante da palavra
        const suffix = cleanTitleWord.slice(lastWord.length)

        return { completion, suffix }
      }
    }
  }

  return null
}

/**
 * Get inline autocomplete suggestion based on word completion.
 * Returns the completion for the word being typed, not the entire title.
 * E.g., if user types "Diplo" and a title contains "Diplomacia", suggests "Diplomacia".
 * Uses accent-insensitive comparison for Portuguese text.
 */
export async function getInlineAutocompleteSuggestion(
  query: string,
): Promise<InlineAutocompleteSuggestion | null> {
  if (!query || query.length < 2) return null

  // Normaliza múltiplos espaços para um único espaço e faz trim
  const trimmedQuery = query.trim().replace(/\s+/g, ' ')
  // Pega a última palavra digitada (a que queremos completar)
  const queryWords = trimmedQuery.split(' ')
  const lastWord = queryWords[queryWords.length - 1]

  // Só sugere se a última palavra tem pelo menos 2 caracteres
  if (lastWord.length < 2) return null

  try {
    const suggestions = await content().getSearchSuggestions(trimmedQuery)
    const titles = suggestions.map((s) => s.title)
    return deriveInlineAutocomplete(trimmedQuery, titles)
  } catch {
    return null
  }
}

export async function getSearchSuggestions(
  query: string,
): Promise<SearchSuggestion[]> {
  if (!query || query.length < 2) return []

  // Normaliza múltiplos espaços para um único espaço
  const normalizedQuery = query.trim().replace(/\s+/g, ' ')

  try {
    const suggestions = await content().getSearchSuggestions(normalizedQuery)

    // O facade já ordena/limita server-side; aplicamos o top-7 do portal.
    return suggestions.slice(0, 7).map((s) => ({
      unique_id: s.uniqueId,
      title: s.title,
    }))
  } catch {
    return []
  }
}

/**
 * Combined search that returns both suggestions and inline autocomplete in a single request.
 * This avoids duplicate queries and improves performance.
 */
export async function getCombinedSearchResults(
  query: string,
): Promise<CombinedSearchResults> {
  if (!query || query.length < 2) {
    return {
      suggestions: [],
      inlineAutocomplete: null,
    }
  }

  // Normaliza múltiplos espaços para um único espaço e faz trim
  const normalizedQuery = query.trim().replace(/\s+/g, ' ')

  try {
    // Uma única chamada ao facade
    const raw = await content().getSearchSuggestions(normalizedQuery)

    // Sugestões (top-7, espelhando o comportamento do portal)
    const top = raw.slice(0, 7)
    const suggestions = top.map((s) => ({
      unique_id: s.uniqueId,
      title: s.title,
    }))

    // Autocomplete inline derivado dos títulos das sugestões
    const inlineAutocomplete = deriveInlineAutocomplete(
      normalizedQuery,
      raw.map((s) => s.title),
    )

    return {
      suggestions,
      inlineAutocomplete,
    }
  } catch {
    return {
      suggestions: [],
      inlineAutocomplete: null,
    }
  }
}

export async function queryArticles(
  args: QueryArticlesArgs,
): Promise<QueryArticlesResult> {
  const {
    page,
    query,
    startDate,
    endDate,
    agencies,
    themes,
    semantic = true,
  } = args

  const normalizedQuery = query ? query.trim().replace(/\s+/g, ' ') : null

  // Datas: o filtro do facade usa strings ISO (DateTime do schema).
  // startDate/endDate chegam em ms; endDate é exclusivo do dia seguinte no
  // comportamento original (`< endDate + 1 dia`).
  const startIso = startDate ? new Date(startDate).toISOString() : null
  const endIso = endDate ? new Date(endDate + 86400000).toISOString() : null

  const result = await content().searchArticles({
    query: normalizedQuery ?? '',
    page,
    // graphql-api faz embeddings + híbrido server-side (alpha:0.8, group_by content_hash).
    semantic,
    alpha: 0.8,
    dedup: true,
    filter: {
      agencies: agencies && agencies.length > 0 ? agencies : null,
      themes: themes && themes.length > 0 ? themes : null,
      startDate: startIso,
      endDate: endIso,
    },
  })

  // Preserva o contrato original: `page` é o cursor da PRÓXIMA página
  // (a server action antiga retornava `page + 1`). React Query usa este
  // valor em `getNextPageParam` para o scroll infinito.
  return {
    articles: result.articles,
    page: page + 1,
    found: result.found,
  }
}
