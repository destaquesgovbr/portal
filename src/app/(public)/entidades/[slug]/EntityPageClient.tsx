'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ExternalLink, Tag as TagIcon } from 'lucide-react'
import { useInView } from 'react-intersection-observer'
import NewsCard from '@/components/articles/NewsCard'
import { Badge } from '@/components/ui/badge'
import { entityTypeStyle } from '@/lib/entity-types'
import type { EntityNode } from '@/services/content/types'
import { getEntityArticles } from './actions'

type EntityPageClientProps = {
  /** Id canônico (`Q…`/`dgb_…`) quando a página é canônica; senão `null`. */
  canonicalId: string | null
  /** Texto canônico exato da entidade (caminho legado; vazio quando canônico). */
  entityText: string
  /** Rótulo do cabeçalho (nome canônico, ou o deslug do texto legado). */
  slugLabel: string
  /** Nó do registry (só no caminho canônico, pode ser `null` se não resolveu). */
  entityNode: EntityNode | null
  /** Contagem inicial (do facet, só no caminho legado), se disponível. */
  initialCount: number | null
}

export default function EntityPageClient({
  canonicalId,
  entityText,
  slugLabel,
  entityNode,
  initialCount,
}: EntityPageClientProps) {
  // Dispara a query quando temos um id canônico OU um texto legado resolvido.
  // Caso contrário (texto não resolvido, Fase 0 pendente), mostra o estado vazio.
  const resolved = canonicalId != null || entityText.length > 0
  const displayName = entityNode?.canonicalName ?? slugLabel
  const typeStyle = entityNode?.type ? entityTypeStyle(entityNode.type) : null
  const TypeIcon = typeStyle?.icon ?? TagIcon

  const articlesQ = useInfiniteQuery({
    queryKey: ['entity-articles', canonicalId ?? entityText],
    queryFn: ({ pageParam }: { pageParam: number | null }) =>
      getEntityArticles({
        entity: entityText,
        canonicalId,
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
          <TypeIcon className="h-4 w-4" aria-hidden />
          {typeStyle?.label ?? 'Entidade'}
        </div>

        <h1 className="text-3xl font-bold text-primary">{displayName}</h1>

        {/* Linha divisória SVG */}
        <div className="mx-auto mt-3 w-40">
          <img src="/underscore.svg" alt="" />
        </div>

        {/* Descrição canônica (Wikidata/registry), quando disponível */}
        {entityNode?.description && (
          <p className="mx-auto mt-4 max-w-2xl text-base text-primary/70">
            {entityNode.description}
          </p>
        )}

        {found > 0 && (
          <p className="mt-4 text-base text-primary/80">
            {new Intl.NumberFormat('pt-BR').format(found)} notícia
            {found === 1 ? '' : 's'} mencionam esta entidade.
          </p>
        )}

        {/* Link para o verbete Wikidata da entidade canônica */}
        {entityNode?.wikidataUrl && (
          <div className="mt-4 flex justify-center">
            <a
              href={entityNode.wikidataUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary/70 hover:text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              {entityNode.wikidataId ?? 'Wikidata'}
            </a>
          </div>
        )}

        {/* Aliases conhecidos da entidade canônica */}
        {entityNode?.aliases && entityNode.aliases.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {entityNode.aliases.map((alias) => (
              <Badge
                key={alias}
                className="bg-white text-primary/80 font-normal"
              >
                {alias}
              </Badge>
            ))}
          </div>
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
