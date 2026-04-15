'use client'

import { useQuery } from '@tanstack/react-query'
import { Loader2, Search, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { getCombinedSearchResults } from '@/app/(public)/busca/actions'
import { Input } from '@/components/ui/input'
import { removeDiacritics } from '@/lib/utils'
import type { CombinedSearchResults, SearchSuggestion } from '@/types/search'

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text

  // Normalize multiple spaces to single space in query
  const normalizedSpaceQuery = query.trim().replace(/\s+/g, ' ')

  // Normalize both text and query for accent-insensitive matching
  const normalizedText = removeDiacritics(text)
  const normalizedQuery = removeDiacritics(normalizedSpaceQuery)
  const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedQuery})`, 'gi')

  // Find all match positions in the normalized text
  const matches: Array<{ start: number; end: number }> = []
  let match = regex.exec(normalizedText)

  while (match !== null) {
    matches.push({ start: match.index, end: match.index + match[0].length })
    match = regex.exec(normalizedText)
  }

  if (matches.length === 0) return text

  // Build result using original text with matches highlighted
  const result: React.ReactNode[] = []
  let lastIndex = 0
  let matchCount = 0

  for (const { start, end } of matches) {
    // Add text before the match
    if (start > lastIndex) {
      result.push(text.slice(lastIndex, start))
    }
    // Add highlighted match (using original text, not normalized)
    const matchedText = text.slice(start, end)
    result.push(
      <mark
        key={`match-${matchCount++}-${start}`}
        className="bg-yellow-200 text-inherit rounded-sm"
      >
        {matchedText}
      </mark>,
    )
    lastIndex = end
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex))
  }

  return result
}

const SearchBar = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Initialize query from URL params
  const initialQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [keyboardNavigated, setKeyboardNavigated] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isPending, startTransition] = useTransition()

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevUrlQueryRef = useRef<string>(initialQuery)
  const prevPathnameRef = useRef<string>(pathname)
  const suggestionRefs = useRef<(HTMLAnchorElement | null)[]>([])

  // Sync query with URL params when they change externally
  const urlQuery = searchParams.get('q') || ''

  useEffect(() => {
    const prevUrlQuery = prevUrlQueryRef.current
    const prevPathname = prevPathnameRef.current
    const pathnameChanged = pathname !== prevPathname
    const isArticlePage = pathname.startsWith('/artigos/')
    const wasSearchPage = prevPathname === '/busca'

    if (urlQuery !== prevUrlQuery) {
      // URL query changed
      if (urlQuery) {
        // URL has a query, update search bar
        setQuery(urlQuery)
        setDebouncedQuery(urlQuery)
      } else if (!isArticlePage || !wasSearchPage) {
        // URL query cleared, but NOT going from search to article
        // Clear the search bar
        setQuery('')
        setDebouncedQuery('')
        setIsOpen(false)
      }
      // If going from search to article, keep the query as is
      prevUrlQueryRef.current = urlQuery
    } else if (pathnameChanged && !urlQuery && !isArticlePage) {
      // Pathname changed, no query in URL, and not going to an article page
      // Clear searchbar (user navigated away from search context)
      setQuery('')
      setDebouncedQuery('')
      setIsOpen(false)
    }

    prevPathnameRef.current = pathname
  }, [urlQuery, pathname])

  // Fetch both suggestions and inline autocomplete in a single query
  const { data: searchResults } = useQuery<CombinedSearchResults>({
    queryKey: ['combinedSearch', debouncedQuery],
    queryFn: () => getCombinedSearchResults(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const suggestions = searchResults?.suggestions ?? []
  const inlineSuggestion = searchResults?.inlineAutocomplete ?? null

  // Calculate the current suffix based on real-time query (not debounced)
  // This prevents the visual delay when typing
  // Uses accent-insensitive comparison for Portuguese text
  const currentSuffix = (() => {
    if (!inlineSuggestion || query.length < 2 || !isFocused) return null

    // Normalize multiple spaces to single space for comparison
    const normalizedQueryForComparison = query.trim().replace(/\s+/g, ' ')

    const normalizedCompletion = removeDiacritics(
      inlineSuggestion.completion.toLowerCase(),
    )
    const normalizedQuery = removeDiacritics(
      normalizedQueryForComparison.toLowerCase(),
    )

    if (normalizedCompletion.startsWith(normalizedQuery)) {
      return inlineSuggestion.completion.slice(
        normalizedQueryForComparison.length,
      )
    }
    return null
  })()

  const showInlineSuggestion = currentSuffix && currentSuffix.length > 0

  // Derive isOpen state from suggestions
  const shouldShowDropdown =
    isOpen && suggestions.length > 0 && query.length >= 2

  // Close dropdown on click outside (this useEffect is necessary for document listeners)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Scroll selected suggestion into view when navigating with keyboard
  useEffect(() => {
    if (
      selectedIndex >= 0 &&
      keyboardNavigated &&
      suggestionRefs.current[selectedIndex]
    ) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [selectedIndex, keyboardNavigated])

  // Accept the inline autocomplete suggestion
  const acceptInlineSuggestion = () => {
    if (showInlineSuggestion && inlineSuggestion) {
      setQuery(inlineSuggestion.completion)
      setDebouncedQuery(inlineSuggestion.completion)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setQuery(newValue)
    setSelectedIndex(-1)
    setKeyboardNavigated(false)

    // Debounce the query update
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(newValue)
      // Open dropdown when we have a query
      if (newValue.length >= 2) {
        setIsOpen(true)
      } else {
        setIsOpen(false)
      }
    }, 300)
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const normalizedQuery = query.trim().replace(/\s+/g, ' ')
    setIsOpen(false)
    inputRef.current?.blur()

    if (normalizedQuery) {
      router.push(`/busca?q=${encodeURIComponent(normalizedQuery)}`)
    } else {
      router.push('/busca')
    }
  }

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.title)
    setIsOpen(false)
    startTransition(() => {
      router.push(`/artigos/${suggestion.unique_id}`)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Escape regardless of dropdown state
    if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
      return
    }

    // Handle Tab or ArrowRight to accept inline suggestion
    if ((e.key === 'Tab' || e.key === 'ArrowRight') && showInlineSuggestion) {
      // Only accept on ArrowRight if cursor is at the end
      const input = e.currentTarget
      if (e.key === 'ArrowRight' && input.selectionStart !== query.length) {
        return // Let default ArrowRight behavior happen
      }
      e.preventDefault()
      acceptInlineSuggestion()
      return
    }

    if (!shouldShowDropdown) {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setKeyboardNavigated(true)
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev,
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setKeyboardNavigated(true)
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (
          keyboardNavigated &&
          selectedIndex >= 0 &&
          selectedIndex < suggestions.length
        ) {
          handleSelectSuggestion(suggestions[selectedIndex])
        } else {
          handleSubmit()
        }
        break
    }
  }

  const handleClear = () => {
    setQuery('')
    setDebouncedQuery('')
    setIsOpen(false)

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Remove apenas o parâmetro 'q' da URL, mantendo os outros filtros
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')

    // Se estiver na página de busca e houver outros filtros, mantenha na página de busca
    // Caso contrário, volte para a home
    if (pathname === '/busca' && params.toString()) {
      router.push(`/busca?${params.toString()}`)
    } else if (pathname === '/busca') {
      router.push('/')
    }
    // Se não estiver na página de busca, apenas limpa o campo (não navega)
  }

  const listboxId = 'search-suggestions-listbox'

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          {isPending ? (
            <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          {/* Inline autocomplete ghost text layer */}
          {showInlineSuggestion && (
            <div
              className="absolute inset-0 pl-10 pr-10 pointer-events-none overflow-hidden text-base md:text-sm flex items-center"
              aria-hidden="true"
            >
              <span className="whitespace-pre">
                <span className="text-transparent">{query}</span>
                <span className="text-muted-foreground/50">
                  {currentSuffix}
                </span>
              </span>
            </div>
          )}
          <Input
            ref={inputRef}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Buscar notícias..."
            className={`${query ? 'pl-10 pr-10' : 'pl-10'} bg-transparent`}
            role="combobox"
            aria-expanded={shouldShowDropdown}
            aria-controls={listboxId}
            aria-activedescendant={
              selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined
            }
            aria-autocomplete="both"
            autoComplete="off"
            disabled={isPending}
          />
          {query && !isPending && (
            <X
              onClick={handleClear}
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground rounded-full p-2 hover:bg-gray-200 active:bg-gray-300 hover:cursor-pointer transition-colors touch-manipulation"
              aria-label="Limpar busca"
            />
          )}
        </div>
      </form>

      {/* Suggestions dropdown */}
      {shouldShowDropdown && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Sugestões de busca"
          className="absolute z-50 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-80 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <Link
              key={suggestion.unique_id}
              id={`suggestion-${index}`}
              ref={(el) => {
                suggestionRefs.current[index] = el
              }}
              role="option"
              aria-selected={index === selectedIndex}
              href={`/artigos/${suggestion.unique_id}`}
              onClick={(e) => {
                e.preventDefault()
                setIsOpen(false)
                setQuery(suggestion.title)
                startTransition(() => {
                  router.push(`/artigos/${suggestion.unique_id}`)
                })
              }}
              className={`block px-4 py-3 text-sm cursor-pointer transition-colors hover:bg-accent/50 ${
                keyboardNavigated && index === selectedIndex
                  ? 'bg-accent text-accent-foreground'
                  : ''
              }`}
            >
              <span className="line-clamp-2">
                {highlightMatch(suggestion.title, query)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default SearchBar
