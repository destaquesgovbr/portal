'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Tag as TagIcon } from 'lucide-react'
import { useInView } from 'react-intersection-observer'
import NewsCard from '@/components/articles/NewsCard'
import { getEntityArticles } from './actions'

type EntityPageClientProps = {
  /** Texto canônico exato da entidade (vazio quando não resolvida). */
  entityText: string
  /** Slug original da URL (usado no header quando a entidade não resolve). */
  slugLabel: string
  /** Contagem inicial (do facet), se disponível. */
  initialCount: number | null
}

export default function EntityPageClient({
  entityText,
  slugLabel,
  initialCount,
}: EntityPageClientProps) {
  // Quando a entidade não resolve (Fase 0 pendente), não dispara a query —
  // a página renderiza o estado vazio amigável.
  const resolved = entityText.length > 0
  const displayName = resolved ? entityText : slugLabel

  const articlesQ = useInfiniteQuery({
    queryKey: ['entity-articles', entityText],
    queryFn: ({ pageParam }: { pageParam: number | null }) =>
      getEntityArticles({
        entity: entityText,
        page: pageParam ?? 1,
      }),
    getNextPageParam: (lastPage) => lastPage.page ?? undefined,
    initialPageParam: 1,
    enabled: resolved,
  })

  const { ref } = useInView({
    onChange: (inView) => {
      if (inView && articlesQ.hasNextPage && !articlesQ.isFetchingNextPage) {
        articlesQ.fetchNextPage()
      }
    },
  })

  const articles = articlesQ.data?.pages.flatMap((page) => page.articles) ?? []
  const found = articlesQ.data?.pages[0]?.found ?? initialCount ?? 0

  return (
    <section className="py-16">
      {/* Cabeçalho institucional da entidade */}
      <div className="container mx-auto px-4 text-center mb-12">
        <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary/70">
          <TagIcon className="h-4 w-4" aria-hidden />
          Entidade
        </div>

        <h1 className="text-3xl font-bold text-primary">{displayName}</h1>

        {/* Linha divisória SVG */}
        <div className="mx-auto mt-3 w-40">
          <img src="/underscore.svg" alt="" />
        </div>

        {resolved && found > 0 && (
          <p className="mt-4 text-base text-primary/80">
            {new Intl.NumberFormat('pt-BR').format(found)} notícia
            {found === 1 ? '' : 's'} mencionam esta entidade.
          </p>
        )}
      </div>

      {/* Conteúdo */}
      <div className="container mx-auto px-4">
        {articlesQ.isError ? (
          <p className="text-center text-red-500">
            Ocorreu um erro ao carregar as notícias.
          </p>
        ) : (
          <main className="min-w-0">
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

            {!articlesQ.isLoading && articles.length === 0 && (
              <div className="mx-auto mt-8 max-w-xl text-center">
                <p className="text-primary/70">
                  Ainda não há notícias indexadas para esta entidade.
                </p>
                <p className="mt-2 text-sm text-primary/50">
                  As menções a entidades estão sendo processadas e ficarão
                  disponíveis em breve.
                </p>
              </div>
            )}
          </main>
        )}
      </div>
    </section>
  )
}
