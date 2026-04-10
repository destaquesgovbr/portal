import { ExternalLink, Pencil } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { ClippingDetailView } from '@/components/clipping/ClippingDetailView'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { estimateTotalCount } from '@/lib/estimate-recorte-count'
import { getFirestoreDb } from '@/lib/firebase-admin'
import { resolveRecorteLabels } from '@/lib/recorte-utils'
import { fetchReleasesForClipping } from '@/lib/release-utils'

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

  const isPublished =
    clipping.publishedToMarketplace && clipping.marketplaceListingId

  // Shared data
  const [resolvedRecortes, { releases, hasMore }, estimation] =
    await Promise.all([
      resolveRecorteLabels(clipping.recortes ?? []),
      fetchReleasesForClipping(clippingId, clipping.name),
      estimateTotalCount(clipping.recortes ?? []).catch(() => ({
        total: 0,
        perRecorte: [],
      })),
    ])

  const ownerActions = (
    <div className="flex items-center gap-3 flex-wrap">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/minha-conta/clipping/${clippingId}/editar`}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Editar
        </Link>
      </Button>
      {isPublished && (
        <Link
          href={`/clippings/${clipping.marketplaceListingId}`}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ver página pública
        </Link>
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
  )

  return (
    <ClippingDetailView
      name={clipping.name}
      description={clipping.description}
      schedule={clipping.schedule}
      recortes={resolvedRecortes}
      estimatedCount={estimation.total}
      perRecorteEstimates={estimation.perRecorte}
      releases={releases}
      hasMoreReleases={hasMore}
      releasesApiPath={`/api/clipping/${clippingId}/releases`}
      releasesPagePath={
        isPublished
          ? `/clippings/${clipping.marketplaceListingId}/releases`
          : undefined
      }
      actions={ownerActions}
    />
  )
}
