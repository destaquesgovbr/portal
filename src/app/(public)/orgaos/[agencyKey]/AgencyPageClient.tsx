'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { ArticleFilters } from '@/components/articles/ArticleFilters'
import NewsCard from '@/components/articles/NewsCard'
import { FeedLink } from '@/components/common/FeedLink'
import type { ThemeOption } from '@/data/themes-utils'
import { getExcerpt } from '@/lib/utils'
import { getArticles } from './actions'

type AgencyPageClientProps = {
  agencyKey: string
  agencyName: string
  themes: ThemeOption[]
}

export default function AgencyPageClient({
  agencyKey,
  agencyName,
  themes,
}: AgencyPageClientProps) {
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

  const [selectedThemes, setSelectedThemes] = useState<string[]>(() => {
    const temas = searchParams.get('temas')
    return temas ? temas.split(',') : []
  })

  // Function to update URL params
  const updateUrlParams = useCallback(
    (updates: {
      dataInicio?: string | null
      dataFim?: string | null
      temas?: string | null
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

  const handleThemesChange = useCallback(
    (themesList: string[]) => {
      setSelectedThemes(themesList)
      updateUrlParams({
        temas: themesList.length > 0 ? themesList.join(',') : null,
      })
    },
    [updateUrlParams],
  )

  const articlesQ = useInfiniteQuery({
    queryKey: ['articles', agencyKey, startDate, endDate, selectedThemes],
    queryFn: ({ pageParam }: { pageParam: number | null }) =>
      getArticles({
        page: pageParam ?? 1,
        agency: agencyKey,
        startDate: startDate?.getTime(),
        endDate: endDate?.getTime(),
        themes: selectedThemes.length > 0 ? selectedThemes : undefined,
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
      {/* Cabeçalho institucional do órgão */}
      <div className="container mx-auto px-4 text-center mb-12">
        <h2 className="text-3xl font-bold text-primary">{agencyName}</h2>

        {/* Linha divisória SVG */}
        <div className="mx-auto mt-3 w-40">
          <img src="/underscore.svg" alt="" />
        </div>

        {/* Subtítulo */}
        <p className="mt-4 text-base text-primary/80">
          Acompanhe as notícias e publicações oficiais deste órgão.
        </p>

        <div className="mt-4">
          <FeedLink params={{ agencias: [agencyKey] }} />
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - Filters */}
          <ArticleFilters
            themes={themes}
            startDate={startDate}
            endDate={endDate}
            selectedThemes={selectedThemes}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            onThemesChange={handleThemesChange}
            getThemeName={getThemeName}
            getThemeHierarchyPath={getThemeHierarchyPath}
            showAgencyFilter={false}
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
                  trackingOrigin="agency"
                />
              ))}
            </motion.div>

            {articles.length === 0 && (
              <p className="text-center text-primary/60 mt-12">
                Nenhum artigo encontrado para este órgão no momento.
              </p>
            )}
          </main>
        </div>
      </div>
    </section>
  )
}
