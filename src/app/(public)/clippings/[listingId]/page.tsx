import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { ClippingDetailView } from '@/components/clipping/ClippingDetailView'
import { ListingActions } from '@/components/marketplace/ListingActions'
import { estimateTotalCount } from '@/lib/estimate-recorte-count'
import { createSSRClient } from '@/lib/graphql/client'
import { getHasTelegram } from '@/lib/graphql/user'
import { resolveRecorteLabels } from '@/lib/recorte-utils'
import { getMarketplaceService } from '@/services/marketplace'

export const revalidate = 600

interface Props {
  params: Promise<{ listingId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { listingId } = await params
  try {
    // Caminho público (sem token) — só precisamos dos metadados.
    const listing = await getMarketplaceService(createSSRClient()).getListing(
      listingId,
    )
    if (!listing || !listing.active) {
      return { title: 'Listing não encontrado — DestaquesGovBr' }
    }
    return {
      title: `${listing.name} — Marketplace — DestaquesGovBr`,
      description: listing.description,
    }
  } catch {
    return { title: 'Marketplace — DestaquesGovBr' }
  }
}

export default async function ListingDetailPage({ params }: Props) {
  const { listingId } = await params
  const session = await auth()

  // SSR client com token (se logado) → `hasLiked`/`hasFollowed` resolvidos pelo
  // schema; público sem token continua funcionando (flags vêm null → false).
  const client = createSSRClient(async () => session?.accessToken ?? null)
  const service = getMarketplaceService(client)

  const listing = await service.getListing(listingId)
  if (!listing || !listing.active) notFound()

  const userHasLiked = listing.userHasLiked ?? false
  const userFollows = listing.userFollows ?? false

  // Flag de Telegram só faz sentido para usuário logado.
  const hasTelegram = session?.user?.id ? await getHasTelegram(client) : false

  // Shared data
  const [resolvedRecortes, releasesPage, estimation] = await Promise.all([
    resolveRecorteLabels(listing.recortes),
    // Caminho PÚBLICO: `MarketplaceListing.releases` (público para listing
    // ativo). NÃO usamos `clipping.releases` (gated a autor/assinante →
    // UNAUTHENTICATED para anônimo). O preview vem no campo `digest` do Release.
    service.listListingReleases(listingId, { limit: 10 }),
    estimateTotalCount(listing.recortes).catch(() => ({
      total: 0,
      perRecorte: [],
    })),
  ])

  const releases = releasesPage.releases.map((r) => ({
    id: r.id,
    clippingName: r.clippingName || listing.name,
    articlesCount: r.articlesCount,
    createdAt: r.createdAt,
    releaseUrl: r.releaseUrl || `/clipping/release/${r.id}`,
    refTime: r.refTime ?? null,
    sinceHours: r.sinceHours ?? null,
    digestPreview: r.digest || undefined,
  }))
  const hasMore = releasesPage.hasMore

  return (
    <ClippingDetailView
      name={listing.name}
      description={listing.description}
      schedule={listing.schedule}
      coverImageUrl={listing.coverImageUrl}
      authorDisplayName={listing.authorDisplayName}
      publishedAt={listing.publishedAt}
      recortes={resolvedRecortes}
      estimatedCount={estimation.total}
      perRecorteEstimates={estimation.perRecorte}
      releases={releases}
      hasMoreReleases={hasMore}
      releasesListingId={listing.id}
      releasesPagePath={`/clippings/${listing.id}/releases`}
      actions={
        <ListingActions
          listing={listing}
          userFollows={userFollows}
          userHasLiked={userHasLiked}
          hasTelegram={hasTelegram}
        />
      }
      feedLinks={{
        rss: `/api/clippings/public/${listing.id}/feed.xml`,
        json: `/api/clippings/public/${listing.id}/feed.json`,
      }}
    />
  )
}
