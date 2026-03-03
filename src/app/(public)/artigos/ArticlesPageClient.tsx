'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { ArticleFilters } from '@/components/articles/ArticleFilters'
import NewsCard from '@/components/articles/NewsCard'
import type { AgencyOption } from '@/data/agencies-utils'
import type { ThemeOption } from '@/data/themes-utils'
import { getExcerpt } from '@/lib/utils'
import { getArticles, type TagFacet } from './actions'

type ArticlesPageClientProps = {
  agencies: AgencyOption[]
  themes: ThemeOption[]
  popularTags: TagFacet[]
}

export default function ArticlesPageClient({
  agencies,
  themes,
  popularTags,
}: ArticlesPageClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

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

  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const tags = searchParams.get('tags')
    return tags ? tags.split(',') : []
  })

  // Function to update URL params
  const updateUrlParams = useCallback(
    (updates: {
      dataInicio?: string | null
      dataFim?: string | null
      agencias?: string | null
      temas?: string | null
      tags?: string | null
    }) => {
      const params = new URLSearchParams(searchParams.toString())

      // Update or remove each param
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      })

      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname
      router.replace(newUrl, { scroll: false })
    },
    [searchParams, pathname, router],
  )

  // Wrapped setters that update URL
  const handleStartDateChange = useCallback(
    (date: Date | undefined) => {
      setStartDate(date)
      updateUrlParams({
        dataInicio: date ? date.toISOString().split('T')[0] : null,
      })
    },
    [updateUrlParams],
  )

  const handleEndDateChange = useCallback(
    (date: Date | undefined) => {
      setEndDate(date)
      updateUrlParams({
        dataFim: date ? date.toISOString().split('T')[0] : null,
      })
    },
    [updateUrlParams],
  )

  const handleAgenciesChange = useCallback(
    (agenciesList: string[]) => {
      setSelectedAgencies(agenciesList)
      updateUrlParams({
        agencias: agenciesList.length > 0 ? agenciesList.join(',') : null,
      })
    },
    [updateUrlParams],
  )

  const handleThemesChange = useCallback(
    (themesList: string[]) => {
      setSelectedThemes(themesList)
      updateUrlParams({
        temas: themesList.length > 0 ? themesList.join(',') : null,
      })
    },
    [updateUrlParams],
  )

  const handleTagsChange = useCallback(
    (tagsList: string[]) => {
      setSelectedTags(tagsList)
      updateUrlParams({
        tags: tagsList.length > 0 ? tagsList.join(',') : null,
      })
    },
    [updateUrlParams],
  )

  const articlesQ = useInfiniteQuery({
    queryKey: [
      'articles',
      startDate,
      endDate,
      selectedAgencies,
      selectedThemes,
      selectedTags,
    ],
    queryFn: ({ pageParam }: { pageParam: number | null }) =>
      getArticles({
        page: pageParam ?? 1,
        startDate: startDate?.getTime(),
        endDate: endDate?.getTime(),
        agencies: selectedAgencies.length > 0 ? selectedAgencies : undefined,
        themes: selectedThemes.length > 0 ? selectedThemes : undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
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
          Ocorreu um erro ao carregar os artigos.
        </p>
      </div>
    )
  }

  return (
    <section className="py-16">
      {/* Cabeçalho institucional */}
      <div className="container mx-auto px-4 text-center mb-12">
        <h2 className="text-3xl font-bold text-primary">Notícias</h2>

        {/* Linha divisória SVG */}
        <div className="mx-auto mt-3 w-40">
          <img src="/underscore.svg" alt="" />
        </div>

        {/* Subtítulo institucional */}
        <p className="mt-4 text-base text-primary/80">
          Acompanhe as últimas notícias, atualizações e comunicados oficiais do
          portal.
        </p>
      </div>

      {/* Main Content with Sidebar */}
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - Filters */}
          <ArticleFilters
            agencies={agencies}
            themes={themes}
            popularTags={popularTags}
            startDate={startDate}
            endDate={endDate}
            selectedAgencies={selectedAgencies}
            selectedThemes={selectedThemes}
            selectedTags={selectedTags}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            onAgenciesChange={handleAgenciesChange}
            onThemesChange={handleThemesChange}
            onTagsChange={handleTagsChange}
            getAgencyName={getAgencyName}
            getThemeName={getThemeName}
            getThemeHierarchyPath={getThemeHierarchyPath}
          />

          {/* Right Content - Results Grid */}
          <main className="flex-1 min-w-0">
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
                  summary={getExcerpt(article.content || '', 150)}
                  title={article.title || ''}
                  imageUrl={article.image || ''}
                  trackingOrigin="articles"
                />
              ))}
            </motion.div>
          </main>
        </div>
      </div>
    </section>
  )
}
