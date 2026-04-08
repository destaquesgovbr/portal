import { format, subHours } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { buildFilterBy, hasFilters } from '@/lib/estimate-recorte-count'
import { getFirestoreDb } from '@/lib/firebase-admin'
import { typesense } from '@/services/typesense/client'
import type { Recorte } from '@/types/clipping'

export const revalidate = 600

type Props = { params: Promise<{ releaseId: string }> }

type Article = {
  unique_id: string
  title: string
  agency: string
  published_at: number
  url: string
  summary?: string
  theme_1_level_1_label?: string
}

export async function generateMetadata({ params }: Props) {
  const { releaseId } = await params
  const db = getFirestoreDb()
  const doc = await db.collection('releases').doc(releaseId).get()
  if (!doc.exists) return { title: 'Artigos da edição' }
  const name = doc.data()?.clippingName ?? 'Clipping'
  return { title: `Artigos — ${name} — DestaquesGovBr` }
}

export default async function ReleaseArticlesPage({ params }: Props) {
  const { releaseId } = await params
  const db = getFirestoreDb()

  const releaseDoc = await db.collection('releases').doc(releaseId).get()
  if (!releaseDoc.exists) notFound()

  const release = releaseDoc.data()!
  const refTime = release.refTime?.toDate?.() ?? null
  const sinceHours: number | null = release.sinceHours ?? null

  // Fetch clipping recortes
  let recortes: Recorte[] = []
  if (release.clippingId) {
    const clippingDoc = await db
      .collection('clippings')
      .doc(release.clippingId)
      .get()
    if (clippingDoc.exists) {
      recortes = clippingDoc.data()?.recortes ?? []
    }
  }

  // Calculate time window
  let startDate: Date | null = null
  let endDate: Date | null = null
  if (refTime && sinceHours) {
    endDate = refTime
    startDate = subHours(refTime, sinceHours)
  }

  // Fetch articles using the same OR-between-recortes logic as the worker
  const sinceTimestamp = startDate
    ? Math.floor(startDate.getTime() / 1000)
    : Math.floor(Date.now() / 1000) - 24 * 3600

  const seen = new Set<string>()
  const articles: Article[] = []

  for (const recorte of recortes) {
    if (!hasFilters(recorte)) continue
    const filterBy = buildFilterBy(recorte, sinceTimestamp)

    const queryTerms = recorte.keywords.length > 0 ? recorte.keywords : ['*']

    for (const term of queryTerms) {
      const result = await typesense.collections('news').documents().search({
        q: term,
        query_by: 'title,summary',
        filter_by: filterBy,
        sort_by: 'published_at:desc',
        per_page: 250,
      })

      for (const hit of result.hits ?? []) {
        const doc = hit.document as Article
        if (!seen.has(doc.unique_id)) {
          seen.add(doc.unique_id)
          articles.push(doc)
        }
      }
    }
  }

  // Sort by published_at desc
  articles.sort((a, b) => (b.published_at ?? 0) - (a.published_at ?? 0))

  // Format time window for display
  const windowText =
    startDate && endDate
      ? `${format(startDate, 'dd/MM/yyyy HH:mm')} a ${format(endDate, 'dd/MM/yyyy HH:mm')}`
      : null

  const refDateText = refTime
    ? format(refTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
    : null

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">
        Artigos — {release.clippingName}
      </h1>

      {refDateText && (
        <p className="mt-1 text-sm text-muted-foreground">
          Edição de {refDateText}
        </p>
      )}

      <div className="mt-4 rounded-md border p-4 bg-muted/30 text-sm text-muted-foreground space-y-2">
        <p>
          Estes são os <strong>{articles.length} artigos</strong> que foram
          considerados para a edição deste clipping
          {windowText && (
            <>
              , publicados no período de <strong>{windowText}</strong>
            </>
          )}
          .
        </p>
        <p>
          Os artigos são selecionados automaticamente a partir dos recortes
          configurados no clipping. Cada recorte define filtros independentes
          (tema, órgão ou palavra-chave) combinados com lógica OR — um artigo
          que satisfaça qualquer recorte é incluído.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {articles.map((article) => (
          <a
            key={article.unique_id}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md border p-4 hover:shadow-sm transition-shadow"
          >
            <h2 className="text-sm font-medium leading-snug">
              {article.title}
            </h2>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {article.agency}
              </Badge>
              {article.theme_1_level_1_label && (
                <Badge variant="secondary" className="text-xs">
                  {article.theme_1_level_1_label}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(article.published_at * 1000).toLocaleDateString(
                  'pt-BR',
                  { day: '2-digit', month: '2-digit', year: 'numeric' },
                )}
              </span>
            </div>
          </a>
        ))}
      </div>

      {articles.length === 0 && (
        <p className="mt-8 text-center text-muted-foreground">
          Nenhum artigo encontrado para esta edição.
        </p>
      )}
    </div>
  )
}
