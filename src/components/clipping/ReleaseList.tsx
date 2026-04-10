'use client'

import { subHours } from 'date-fns'
import {
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Newspaper,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type ReleaseItem = {
  id: string
  clippingName: string
  articlesCount: number
  createdAt: string
  releaseUrl: string
  refTime?: string | null
  sinceHours?: number | null
  digestPreview?: string
}

type ReleaseListProps = {
  listingId: string
  initialReleases: ReleaseItem[]
  hasMore: boolean
  releasesApiPath?: string
  releasesPagePath?: string
  showAllCards?: boolean
}

const BRT = 'America/Sao_Paulo'

function formatReleaseDate(release: ReleaseItem): string {
  const dateStr = release.refTime ?? release.createdAt
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: BRT,
    })
  } catch {
    return dateStr
  }
}

function sortKey(release: ReleaseItem): string {
  return release.refTime ?? release.createdAt ?? ''
}

function formatTimeWindow(release: ReleaseItem): string | null {
  if (!release.refTime || !release.sinceHours) return null
  try {
    const refDate = new Date(release.refTime)
    const startDate = subHours(refDate, release.sinceHours)
    const fmt = (d: Date) =>
      d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: BRT,
      })
    return `${fmt(startDate)} — ${fmt(refDate)}`
  } catch {
    return null
  }
}

export function ReleaseList({
  listingId,
  initialReleases,
  hasMore: initialHasMore,
  releasesApiPath,
  releasesPagePath,
  showAllCards = false,
}: ReleaseListProps) {
  const [releases, setReleases] = useState<ReleaseItem[]>(initialReleases)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const loadMore = useCallback(async () => {
    setLoading(true)
    try {
      const nextPage = page + 1
      const basePath =
        releasesApiPath ?? `/api/clippings/public/${listingId}/releases`
      const response = await fetch(`${basePath}?page=${nextPage}`)
      if (response.ok) {
        const data = await response.json()
        setReleases((prev) => [...prev, ...data.releases])
        setHasMore(data.hasMore)
        setPage(nextPage)
      }
    } finally {
      setLoading(false)
    }
  }, [listingId, page, releasesApiPath])

  if (releases.length === 0) {
    return (
      <section>
        <h3 className="mb-4 font-semibold text-lg">Edições</h3>
        <p className="text-muted-foreground text-sm">
          Nenhuma edição publicada ainda
        </p>
      </section>
    )
  }

  const sorted = [...releases].sort((a, b) =>
    sortKey(b).localeCompare(sortKey(a)),
  )

  function FullCard({ release }: { release: ReleaseItem }) {
    const tw = formatTimeWindow(release)
    return (
      <a
        href={release.releaseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {formatReleaseDate(release)}
              </CardTitle>
              <Badge className="gap-1 text-xs">
                <Newspaper className="h-3 w-3" />
                {release.articlesCount} artigos
              </Badge>
            </div>
            {tw && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {tw}
              </span>
            )}
          </CardHeader>
          {release.digestPreview && (
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {release.digestPreview}
              </p>
            </CardContent>
          )}
        </Card>
      </a>
    )
  }

  if (showAllCards) {
    return (
      <section>
        <div className="space-y-3">
          {sorted.map((release) => (
            <FullCard key={release.id} release={release} />
          ))}
        </div>

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

  const [latest, ...older] = sorted

  return (
    <section>
      {releasesPagePath ? (
        <Link
          href={releasesPagePath}
          className="mb-4 font-semibold text-lg flex items-center gap-1 hover:underline w-fit"
        >
          Edições
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <h3 className="mb-4 font-semibold text-lg">Edições</h3>
      )}

      {/* Latest release — prominent card */}
      <FullCard release={latest} />

      {/* Older releases — compact cards */}
      {older.length > 0 && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {older.map((release) => {
            const tw = formatTimeWindow(release)
            return (
              <a
                key={release.id}
                href={release.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-3 px-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {formatReleaseDate(release)}
                        </p>
                        {tw && (
                          <p className="text-xs text-muted-foreground truncate">
                            {tw}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className="shrink-0 text-xs border-border bg-background">
                      {release.articlesCount}
                    </Badge>
                  </CardContent>
                </Card>
              </a>
            )
          })}
        </div>
      )}

      {hasMore && (
        <div className="mt-4 flex justify-center">
          {releasesPagePath && !showAllCards ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href={releasesPagePath}>
                Ver todas as edições
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMore}
              disabled={loading}
            >
              Ver mais
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
