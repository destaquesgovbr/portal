'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { useUmamiTrack } from '@/components/analytics/useUmamiTrack'
import { ArticleFilters } from '@/components/articles/ArticleFilters'
import NewsCard from '@/components/articles/NewsCard'
import { FeedLink } from '@/components/common/FeedLink'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AgencyOption } from '@/data/agencies-utils'
import type { ThemeOption } from '@/data/themes-utils'
import type { ArticleSort } from '@/services/content/types'
import { queryArticles } from './actions'

type QueryPageClientProps = {
  agencies: AgencyOption[]
  themes: ThemeOption[]
}

/** Opções de ordenação: valor URL (`ordenar`) ↔ enum ArticleSort. */
const SORT_OPTIONS: Array<{
  value: string
  sort: ArticleSort
  label: string
  /** Mantida no mapeamento URL→enum, mas oculta do dropdown. */
  hidden?: boolean
}> = [
  { value: 'relevance', sort: 'RELEVANCE', label: 'Relevância' },
  { value: 'date', sort: 'DATE', label: 'Mais recentes' },
  { value: 'trending', sort: 'TRENDING', label: 'Em alta' },
  // "Mais vistas" (VIEWS) oculto até a DAG de engagement popular view_count (cobertura ~0,3%).
  // O valor segue mapeado para não quebrar links antigos com ?ordenar=views.
  { value: 'views', sort: 'VIEWS', label: 'Mais vistas', hidden: true },
]

const DEFAULT_SORT_VALUE = 'relevance'

function sortValueToEnum(value: string): ArticleSort {
  return SORT_OPTIONS.find((o) => o.value === value)?.sort ?? 'RELEVANCE'
}

export default function QueryPageClient({
  agencies,
  themes,
}: QueryPageClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const query = searchParams.get('q') || undefined

  // Initialize state from URL params
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const dataInicio = searchParams.get('dataInicio')
    return dataInicio ? new Date(dataInicio) : undefined
  })

  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    const dataFim = searchParams.get('dataFim')
    return dataFim ? new Date(dataFim) : undefined
  })

  const [selectedAgencies, setSelectedAgencies] = useState<string[]>(() => {
    const agencias = searchParams.get('agencias')
    return agencias ? agencias.split(',') : []
  })

  const [selectedThemes, setSelectedThemes] = useState<string[]>(() => {
    const temas = searchParams.get('temas')
    return temas ? temas.split(',') : []
  })

  const [semantic, setSemantic] = useState<boolean>(
    () => searchParams.get('semantica') !== '0',
  )

  const [sortValue, setSortValue] = useState<string>(() => {
    const ordenar = searchParams.get('ordenar')
    // Opções ocultas (ex.: ?ordenar=views de links antigos) caem no default.
    return SORT_OPTIONS.some((o) => o.value === ordenar && !o.hidden)
      ? (ordenar as string)
      : DEFAULT_SORT_VALUE
  })

  const [selectedSentiments, setSelectedSentiments] = useState<string[]>(() => {
    const sentimento = searchParams.get('sentimento')
    return sentimento ? sentimento.split(',') : []
  })

  const [selectedEntities, setSelectedEntities] = useState<string[]>(() => {
    const entidades = searchParams.get('entidades')
    return entidades ? entidades.split(',') : []
  })

  // Analytics tracking
  const { track } = useUmamiTrack()
  const hasTrackedSearch = useRef(false)

  // Function to update URL params
  const updateUrlParams = useCallback(
    (updates: {
      dataInicio?: string | null
      dataFim?: string | null
      agencias?: string | null
      temas?: string | null
      ordenar?: string | null
      sentimento?: string | null
      entidades?: string | null
    }) => {
      const params = new URLSearchParams(searchParams.toString())

      // Keep the search query
      if (query) {
        params.set('q', query)
      }

      // Update or remove each param
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      })

      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, query, pathname, router],
  )

  // Wrapped setters that update URL and track filter changes
  const handleStartDateChange = useCallback(
    (date: Date | undefined) => {
      setStartDate(date)
      updateUrlParams({
        dataInicio: date ? date.toISOString().split('T')[0] : null,
      })
      track('filter_changed', {
        filter_type: 'start_date',
        action: date ? 'set' : 'clear',
        value: date ? date.toISOString().split('T')[0] : null,
      })
    },
    [updateUrlParams, track],
  )

  const handleEndDateChange = useCallback(
    (date: Date | undefined) => {
      setEndDate(date)
      updateUrlParams({
        dataFim: date ? date.toISOString().split('T')[0] : null,
      })
      track('filter_changed', {
        filter_type: 'end_date',
        action: date ? 'set' : 'clear',
        value: date ? date.toISOString().split('T')[0] : null,
      })
    },
    [updateUrlParams, track],
  )

  const handleAgenciesChange = useCallback(
    (agenciesList: string[]) => {
      setSelectedAgencies(agenciesList)
      updateUrlParams({
        agencias: agenciesList.length > 0 ? agenciesList.join(',') : null,
      })
      track('filter_changed', {
        filter_type: 'agencies',
        action: agenciesList.length > 0 ? 'set' : 'clear',
        value: agenciesList.length > 0 ? agenciesList.join(',') : null,
      })
    },
    [updateUrlParams, track],
  )

  const handleThemesChange = useCallback(
    (themesList: string[]) => {
      setSelectedThemes(themesList)
      updateUrlParams({
        temas: themesList.length > 0 ? themesList.join(',') : null,
      })
      track('filter_changed', {
        filter_type: 'themes',
        action: themesList.length > 0 ? 'set' : 'clear',
        value: themesList.length > 0 ? themesList.join(',') : null,
      })
    },
    [updateUrlParams, track],
  )

  const handleSortChange = useCallback(
    (value: string) => {
      setSortValue(value)
      updateUrlParams({
        ordenar: value === DEFAULT_SORT_VALUE ? null : value,
      })
      track('filter_changed', {
        filter_type: 'sort',
        action: 'set',
        value,
      })
    },
    [updateUrlParams, track],
  )

  const handleSentimentsChange = useCallback(
    (sentimentsList: string[]) => {
      setSelectedSentiments(sentimentsList)
      updateUrlParams({
        sentimento: sentimentsList.length > 0 ? sentimentsList.join(',') : null,
      })
      track('filter_changed', {
        filter_type: 'sentiment',
        action: sentimentsList.length > 0 ? 'set' : 'clear',
        value: sentimentsList.length > 0 ? sentimentsList.join(',') : null,
      })
    },
    [updateUrlParams, track],
  )

  const handleEntitiesChange = useCallback(
    (entitiesList: string[]) => {
      setSelectedEntities(entitiesList)
      updateUrlParams({
        entidades: entitiesList.length > 0 ? entitiesList.join(',') : null,
      })
      track('filter_changed', {
        filter_type: 'entities',
        action: entitiesList.length > 0 ? 'set' : 'clear',
        value: entitiesList.length > 0 ? entitiesList.join(',') : null,
      })
    },
    [updateUrlParams, track],
  )

  const handleSemanticToggle = useCallback(() => {
    const next = !semantic
    setSemantic(next)
    const params = new URLSearchParams(searchParams.toString())
    if (next) {
      params.delete('semantica')
    } else {
      params.set('semantica', '0')
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    track('filter_changed', {
      filter_type: 'semantic',
      action: next ? 'enable' : 'disable',
    })
  }, [semantic, searchParams, pathname, router, track])

  const articlesQ = useInfiniteQuery({
    queryKey: [
      'articles',
      query,
      startDate,
      endDate,
      selectedAgencies,
      selectedThemes,
      semantic,
      sortValue,
      selectedSentiments,
      selectedEntities,
    ],
    queryFn: ({ pageParam }: { pageParam: number | null }) =>
      queryArticles({
        query,
        page: pageParam ?? 1,
        startDate: startDate?.getTime(),
        endDate: endDate?.getTime(),
        agencies: selectedAgencies.length > 0 ? selectedAgencies : undefined,
        themes: selectedThemes.length > 0 ? selectedThemes : undefined,
        semantic,
        sort: sortValueToEnum(sortValue),
        sentiment:
          selectedSentiments.length > 0 ? selectedSentiments : undefined,
        entities: selectedEntities.length > 0 ? selectedEntities : undefined,
      }),
    getNextPageParam: (lastPage) => lastPage.page ?? undefined,
    initialPageParam: 1,
  })

  const { ref } = useInView({
    onChange: (inView) => {
      if (inView && articlesQ.hasNextPage && !articlesQ.isFetchingNextPage) {
        articlesQ.fetchNextPage()
      }
    },
  })

  const articles = articlesQ.data?.pages.flatMap((page) => page.articles) ?? []
  const totalResults = articlesQ.data?.pages[0]?.found ?? 0

  // Track search event when results are first loaded
  useEffect(() => {
    if (query && articlesQ.isSuccess && !hasTrackedSearch.current) {
      track('search', {
        query,
        results_count: totalResults,
      })
      hasTrackedSearch.current = true
    }
  }, [query, articlesQ.isSuccess, totalResults, track])

  // Reset tracking flag when query changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run on query change
  useEffect(() => {
    hasTrackedSearch.current = false
  }, [query])

  const getAgencyName = useMemo(
    () => (key: string) => {
      const agency = agencies.find((a) => a.key === key)
      return agency?.name || key
    },
    [agencies],
  )

  const getThemeName = useMemo(
    () => (key: string) => {
      const theme = themes.find((t) => t.key === key)
      return theme?.name || key
    },
    [themes],
  )

  const getThemeHierarchyPath = useMemo(
    () => (key: string) => {
      const theme = themes.find((t) => t.key === key)
      return theme?.hierarchyPath || theme?.name || key
    },
    [themes],
  )

  if (articlesQ.isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-red-500">
          Ocorreu um erro ao carregar os resultados.
        </p>
      </div>
    )
  }

  return (
    <section className="py-16">
      {/* Cabeçalho institucional */}
      <div className="container mx-auto px-4 text-center mb-12">
        <h2 className="text-3xl font-bold text-primary">
          Resultados para "{query}"
        </h2>

        {/* Linha divisória SVG */}
        <div className="mx-auto mt-3 w-40">
          <img src="/underscore.svg" alt="" />
        </div>

        {/* Frase de apoio */}
        <p className="mt-4 text-base text-primary/80">
          Veja os artigos e publicações que correspondem à sua busca no portal.
        </p>

        <div className="mt-4">
          <FeedLink
            params={{
              q: query,
              agencias:
                selectedAgencies.length > 0 ? selectedAgencies : undefined,
              temas: selectedThemes.length > 0 ? selectedThemes : undefined,
            }}
          />
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - Filters */}
          <ArticleFilters
            agencies={agencies}
            themes={themes}
            startDate={startDate}
            endDate={endDate}
            selectedAgencies={selectedAgencies}
            selectedThemes={selectedThemes}
            selectedSentiments={selectedSentiments}
            selectedEntities={selectedEntities}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            onAgenciesChange={handleAgenciesChange}
            onThemesChange={handleThemesChange}
            onSentimentsChange={handleSentimentsChange}
            onEntitiesChange={handleEntitiesChange}
            getAgencyName={getAgencyName}
            getThemeName={getThemeName}
            getThemeHierarchyPath={getThemeHierarchyPath}
            showSentimentFilter
            showEntityFilter
          />

          {/* Right Content - Results Grid */}
          <main className="flex-1 min-w-0">
            {/* Toolbar: busca inteligente + ordenação */}
            {query && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant={semantic ? 'default' : 'secondary'}
                  size="sm"
                  onClick={handleSemanticToggle}
                  className="rounded-full gap-1.5"
                  aria-label="busca inteligente"
                  aria-pressed={semantic}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Busca inteligente
                </Button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-primary/70">Ordenar por</span>
                  <Select value={sortValue} onValueChange={handleSortChange}>
                    <SelectTrigger
                      className="w-44 bg-white"
                      aria-label="Ordenar resultados"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.filter((option) => !option.hidden).map(
                        (option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              {articles.map((article, index) => (
                <NewsCard
                  key={article.unique_id}
                  internalUrl={`/artigos/${article.unique_id}`}
                  theme={article.theme_1_level_3_label || ''}
                  date={article.published_at}
                  ref={index === articles.length - 1 ? ref : undefined}
                  summary={article.summary || ''}
                  title={article.title || ''}
                  imageUrl={article.image || ''}
                  trackingOrigin="search"
                />
              ))}
            </motion.div>
          </main>
        </div>
      </div>
    </section>
  )
}
