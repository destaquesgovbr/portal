import { Clock, FileJson, Rss } from 'lucide-react'
import { ArticleCountBadge } from '@/components/clipping/ArticleCountBadge'
import { ReleaseList } from '@/components/clipping/ReleaseList'
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer'
import { Badge } from '@/components/ui/badge'
import { cronToHumanReadable } from '@/lib/cron-utils'
import type { ResolvedRecorte } from '@/lib/recorte-utils'
import type { ReleaseItem } from '@/lib/release-utils'

type Props = {
  name: string
  description?: string
  schedule?: string
  coverImageUrl?: string
  authorDisplayName?: string
  publishedAt?: string
  recortes: ResolvedRecorte[]
  estimatedCount: number
  perRecorteEstimates: number[]

  releases: ReleaseItem[]
  hasMoreReleases: boolean
  releasesPagePath?: string
  releasesApiPath?: string

  actions?: React.ReactNode
  feedLinks?: { rss: string; json: string }
}

export function ClippingDetailView({
  name,
  description,
  schedule,
  coverImageUrl,
  authorDisplayName,
  publishedAt,
  recortes,
  estimatedCount,
  perRecorteEstimates,
  releases,
  hasMoreReleases,
  releasesPagePath,
  releasesApiPath,
  actions,
  feedLinks,
}: Props) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Cover image */}
      {coverImageUrl && (
        <div className="relative aspect-[1200/630] overflow-hidden rounded-lg mb-6">
          <img
            src={coverImageUrl}
            alt={name}
            className="object-cover w-full h-full"
          />
        </div>
      )}

      {/* Title */}
      <h1 className="text-3xl font-bold tracking-tight">{name}</h1>

      {/* Author */}
      {authorDisplayName && (
        <p className="mt-1 text-sm text-muted-foreground">
          Por {authorDisplayName}
        </p>
      )}

      {/* Schedule + estimation */}
      <div className="mt-3 flex items-center gap-4 flex-wrap">
        {schedule && (
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {cronToHumanReadable(schedule)}
          </span>
        )}
        <ArticleCountBadge count={estimatedCount} />
      </div>

      {/* Actions slot */}
      {actions && <div className="mt-4">{actions}</div>}

      {/* Releases */}
      <section className="mt-8">
        <ReleaseList
          listingId=""
          initialReleases={releases}
          hasMore={hasMoreReleases}
          releasesPagePath={releasesPagePath}
          releasesApiPath={releasesApiPath}
        />
      </section>

      {/* Description */}
      {description && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Sobre</h2>
          <MarkdownRenderer content={description} className="prose-sm" />
        </div>
      )}

      {/* Publication date */}
      {publishedAt && (
        <p className="mt-6 text-xs text-muted-foreground">
          Publicado em{' '}
          {new Date(publishedAt).toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      )}

      {/* Feed links */}
      {feedLinks && (
        <div className="mt-4 flex items-center gap-3">
          <a
            href={feedLinks.rss}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Rss className="h-4 w-4" />
            RSS
          </a>
          <a
            href={feedLinks.json}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <FileJson className="h-4 w-4" />
            JSON
          </a>
        </div>
      )}

      {/* Recortes */}
      {recortes.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Recortes</h2>
          <div className="space-y-4">
            {recortes.map((recorte, idx) => (
              <div key={recorte.id} className="border rounded-md p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-medium">
                    {recorte.title ?? `Recorte ${recorte.id.slice(0, 4)}`}
                  </h3>
                  {perRecorteEstimates[idx] != null && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      ~{perRecorteEstimates[idx]} notícias/dia
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recorte.themeLabels.map((label, i) => (
                    <Badge
                      key={recorte.themes[i]}
                      className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                    >
                      Tema: {label}
                    </Badge>
                  ))}
                  {recorte.agencyLabels.map((label, i) => (
                    <Badge
                      key={recorte.agencies[i]}
                      className="text-xs bg-green-50 text-green-700 border-green-200"
                    >
                      Órgão: {label}
                    </Badge>
                  ))}
                  {recorte.keywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                    >
                      Palavra-chave: {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
