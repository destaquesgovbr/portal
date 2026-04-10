import { Clock, ExternalLink, Pencil } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { ReleaseList } from '@/components/clipping/ReleaseList'
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cronToHumanReadable } from '@/lib/cron-utils'
import { getFirestoreDb } from '@/lib/firebase-admin'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClippingDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect('/api/auth/signin')

  const { id: clippingId } = await params
  const db = getFirestoreDb()

  const clippingSnap = await db.collection('clippings').doc(clippingId).get()
  if (!clippingSnap.exists) notFound()

  const clipping = clippingSnap.data()!
  if (clipping.authorUserId !== session.user.id) notFound()

  // Fetch releases
  let initialReleases: Array<{
    id: string
    clippingName: string
    articlesCount: number
    createdAt: string
    releaseUrl: string
    refTime?: string | null
    sinceHours?: number | null
  }> = []
  let hasMoreReleases = false

  try {
    const releasesSnap = await db
      .collection('releases')
      .where('clippingId', '==', clippingId)
      .orderBy('createdAt', 'desc')
      .limit(11)
      .get()
    hasMoreReleases = releasesSnap.docs.length > 10
    initialReleases = releasesSnap.docs.slice(0, 10).map((doc) => {
      const d = doc.data()
      return {
        id: doc.id,
        clippingName: d.clippingName ?? clipping.name,
        articlesCount: d.articlesCount ?? 0,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? '',
        releaseUrl: d.releaseUrl ?? `/clipping/release/${doc.id}`,
        refTime: d.refTime?.toDate?.()?.toISOString?.() ?? null,
        sinceHours: d.sinceHours ?? null,
      }
    })
  } catch (error) {
    console.error('Failed to load releases:', error)
  }

  const isPublished =
    clipping.publishedToMarketplace && clipping.marketplaceListingId

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{clipping.name}</h1>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            {clipping.schedule && (
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {cronToHumanReadable(clipping.schedule)}
              </span>
            )}
            {!clipping.active && (
              <Badge className="text-xs bg-muted text-muted-foreground">
                Inativo
              </Badge>
            )}
            {isPublished && (
              <Badge className="text-xs bg-indigo-100 text-indigo-700 border-indigo-200">
                Publicado
              </Badge>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/minha-conta/clipping/${clippingId}/editar`}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Editar
          </Link>
        </Button>
      </div>

      {clipping.description && (
        <div className="mt-4">
          <MarkdownRenderer
            content={clipping.description}
            className="prose-sm"
          />
        </div>
      )}

      {isPublished && (
        <div className="mt-4">
          <Link
            href={`/clippings/${clipping.marketplaceListingId}`}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver página pública
          </Link>
        </div>
      )}

      {/* Releases */}
      <section className="mt-8">
        <ReleaseList
          listingId={clippingId}
          initialReleases={initialReleases}
          hasMore={hasMoreReleases}
          releasesApiPath={`/api/clipping/${clippingId}/releases`}
        />
      </section>
    </div>
  )
}
