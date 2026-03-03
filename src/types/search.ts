import type { ArticleRow } from './article'

export type QueryArticlesArgs = {
  query?: string
  page: number
  startDate?: number
  endDate?: number
  agencies?: string[]
  themes?: string[]
}

export type QueryArticlesResult = {
  articles: ArticleRow[]
  page: number
  found: number
}

export type SearchSuggestion = {
  unique_id: string
  title: string
}

export type InlineAutocompleteSuggestion = {
  completion: string // The completed word (e.g., "Diplomacia" when user typed "Diplo")
  suffix: string // Just the part to append after user's input (e.g., "macia")
}

export type CombinedSearchResults = {
  suggestions: SearchSuggestion[]
  inlineAutocomplete: InlineAutocompleteSuggestion | null
}
