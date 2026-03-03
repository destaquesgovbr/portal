'use server'

import { getPrioritizedArticles } from '@/config/prioritization'
import { DEFAULT_CONFIG } from '@/config/prioritization-config'
import { removeDiacritics } from '@/lib/utils'
import { typesense } from '@/services/typesense/client'
import type { ArticleRow } from '@/types/article'
import type {
  CombinedSearchResults,
  InlineAutocompleteSuggestion,
  QueryArticlesArgs,
  QueryArticlesResult,
  SearchSuggestion,
} from '@/types/search'

const PAGE_SIZE = 40

/**
 * Shared search function to avoid duplicate Typesense queries.
 * Used by both inline autocomplete and search suggestions.
 */
async function searchArticles(query: string): Promise<ArticleRow[]> {
  const result = await typesense
    .collections<ArticleRow>('news')
    .documents()
    .search({
      q: query,
      query_by: 'title,content',
      query_by_weights: '3,1',
      prefix: true,
      prioritize_exact_match: true,
      drop_tokens_threshold: 5,
      limit: 50,
      pre_segmented_query: false,
    })

  return result.hits?.map((hit) => hit.document as ArticleRow) ?? []
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

  // Normalize multiple spaces to single space and trim
  const trimmedQuery = query.trim().replace(/\s+/g, ' ')
  // Get the last word being typed (the one we want to complete)
  const queryWords = trimmedQuery.split(' ')
  const lastWord = queryWords[queryWords.length - 1]

  // Only suggest if the last word has at least 2 characters
  if (lastWord.length < 2) return null

  const normalizedLastWord = removeDiacritics(lastWord.toLowerCase())

  try {
    const articles = await searchArticles(trimmedQuery)

    // If we have previous words (e.g., "Inteligência" in "Inteligência art")
    // we should only suggest completions from titles that contain those previous words
    const previousWords = queryWords.slice(0, -1)
    const hasPreviousWords = previousWords.length > 0

    // Find a word in any title that starts with the last word the user is typing
    for (const article of articles) {
      const title = article.title ?? ''
      const normalizedTitle = removeDiacritics(title.toLowerCase())

      // If we have previous words, check if the title contains them
      if (hasPreviousWords) {
        const normalizedPreviousPhrase = removeDiacritics(
          previousWords.join(' ').toLowerCase(),
        )

        // Skip this article if it doesn't contain the previous words
        if (!normalizedTitle.includes(normalizedPreviousPhrase)) {
          continue
        }
      }

      const titleWords = title.split(/\s+/)

      for (const titleWord of titleWords) {
        // Clean the title word (remove punctuation at the end)
        const cleanTitleWord = titleWord.replace(/[.,;:!?"')\]]+$/, '')
        const normalizedTitleWord = removeDiacritics(
          cleanTitleWord.toLowerCase(),
        )

        // Check if this title word starts with what the user typed
        if (
          normalizedTitleWord.startsWith(normalizedLastWord) &&
          normalizedTitleWord.length > normalizedLastWord.length
        ) {
          // Build the completion: everything before the last word + the completed word
          const prefix = queryWords.slice(0, -1).join(' ')
          const completion = prefix
            ? `${prefix} ${cleanTitleWord}`
            : cleanTitleWord

          // The suffix is just the remaining part of the word
          const suffix = cleanTitleWord.slice(lastWord.length)

          return {
            completion,
            suffix,
          }
        }
      }
    }

    return null
  } catch {
    return null
  }
}

export async function getSearchSuggestions(
  query: string,
): Promise<SearchSuggestion[]> {
  if (!query || query.length < 2) return []

  // Normalize multiple spaces to single space
  const normalizedQuery = query.trim().replace(/\s+/g, ' ')

  try {
    const articles = await searchArticles(normalizedQuery)

    // Apply prioritization to results
    const prioritized = getPrioritizedArticles(articles, DEFAULT_CONFIG, 7)

    return prioritized.map((article) => ({
      unique_id: article.unique_id,
      title: article.title ?? '',
    }))
  } catch {
    return []
  }
}

/**
 * Combined search that returns both suggestions and inline autocomplete in a single request.
 * This avoids duplicate Typesense queries and improves performance.
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

  // Normalize multiple spaces to single space and trim
  const normalizedQuery = query.trim().replace(/\s+/g, ' ')

  try {
    // Make a single Typesense query
    const articles = await searchArticles(normalizedQuery)

    // Process suggestions
    const prioritized = getPrioritizedArticles(articles, DEFAULT_CONFIG, 7)
    const suggestions = prioritized.map((article) => ({
      unique_id: article.unique_id,
      title: article.title ?? '',
    }))

    // Process inline autocomplete
    const queryWords = normalizedQuery.split(' ')
    const lastWord = queryWords[queryWords.length - 1]
    let inlineAutocomplete: InlineAutocompleteSuggestion | null = null

    if (lastWord.length >= 2) {
      const normalizedLastWord = removeDiacritics(lastWord.toLowerCase())
      const previousWords = queryWords.slice(0, -1)
      const hasPreviousWords = previousWords.length > 0

      for (const article of articles) {
        const title = article.title ?? ''
        const normalizedTitle = removeDiacritics(title.toLowerCase())

        // If we have previous words, check if the title contains them
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
          const cleanTitleWord = titleWord.replace(/[.,;:!?"')\]]+$/, '')
          const normalizedTitleWord = removeDiacritics(
            cleanTitleWord.toLowerCase(),
          )

          if (
            normalizedTitleWord.startsWith(normalizedLastWord) &&
            normalizedTitleWord.length > normalizedLastWord.length
          ) {
            const prefix = queryWords.slice(0, -1).join(' ')
            const completion = prefix
              ? `${prefix} ${cleanTitleWord}`
              : cleanTitleWord
            const suffix = cleanTitleWord.slice(lastWord.length)

            inlineAutocomplete = { completion, suffix }
            break
          }
        }

        if (inlineAutocomplete) break
      }
    }

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
  const { page, query, startDate, endDate, agencies, themes } = args

  const filter_by: string[] = []

  if (startDate) {
    filter_by.push(`published_at:>${Math.floor(startDate / 1000)}`)
  }

  if (endDate) {
    filter_by.push(`published_at:<${Math.floor(endDate / 1000 + 60 * 60 * 3)}`)
  }

  if (agencies && agencies.length > 0) {
    filter_by.push(`agency:[${agencies.join(',')}]`)
  }

  if (themes && themes.length > 0) {
    // Filter by any theme level - level 1, 2, or 3
    const themeFilters = themes.map(
      (theme) =>
        `(theme_1_level_1_code:${theme} || theme_1_level_2_code:${theme} || theme_1_level_3_code:${theme})`,
    )
    filter_by.push(`(${themeFilters.join(' || ')})`)
  }

  // biome-ignore format: true
  const result = await typesense
    .collections<ArticleRow>('news')
    .documents()
    .search({
      q: query ? query.trim().replace(/\s+/g, ' ') : '*',
      query_by: 'title, content',
      sort_by: 'published_at:desc, unique_id:desc',
      filter_by: filter_by.join(" && "),
      limit: PAGE_SIZE,
      page
    })

  return {
    articles: result.hits?.map((hit) => hit.document) ?? [],
    page: page + 1,
    found: result.found ?? 0,
  }
}
