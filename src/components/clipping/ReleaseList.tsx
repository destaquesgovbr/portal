'use client'

import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'

type ReleaseItem = {
  id: string
  clippingName: string
  articlesCount: number
  createdAt: string
  releaseUrl: string
}

type ReleaseListProps = {
  listingId: string
  initialReleases: ReleaseItem[]
  hasMore: boolean
}

export function ReleaseList({
  listingId,
  initialReleases,
  hasMore: initialHasMore,
}: ReleaseListProps) {
  const [releases, setReleases] = useState<ReleaseItem[]>(initialReleases)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const loadMore = useCallback(async () => {
    setLoading(true)
    try {
      const nextPage = page + 1
      const response = await fetch(
        `/api/clippings/public/${listingId}/releases?page=${nextPage}`,
      )
      if (response.ok) {
        const data = await response.json()
        setReleases((prev) => [...prev, ...data.releases])
        setHasMore(data.hasMore)
        setPage(nextPage)
      }
    } finally {
      setLoading(false)
    }
  }, [listingId, page])

  if (releases.length === 0) {
    return (
      <section>
        <p className="text-muted-foreground text-sm">
          Nenhuma edição publicada ainda
        </p>
      </section>
    )
  }

  return (
    <section>
      <h3 className="mb-4 font-semibold text-lg">Edições anteriores</h3>

      <ul className="space-y-3">
        {releases.map((release) => (
          <li key={release.id} className="flex items-center justify-between">
            <a
              href={release.releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 text-sm hover:underline"
            >
              <span>
                {format(parseISO(release.createdAt), "d 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}
              </span>
              <ExternalLink className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
            </a>
            <span className="text-muted-foreground text-xs">
              {release.articlesCount} artigos
            </span>
          </li>
        ))}
      </ul>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadMore}
            disabled={loading}
          >
            Ver mais
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </section>
  )
}
