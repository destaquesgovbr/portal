import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { ReleaseList } from '@/components/clipping/ReleaseList'
import { createSSRClient } from '@/lib/graphql/client'
import { getMarketplaceService } from '@/services/marketplace'

export const revalidate = 600

interface Props {
  params: Promise<{ listingId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { listingId } = await params
  try {
    // Caminho público (sem token) — só precisamos dos metadados do listing.
    const listing = await getMarketplaceService(createSSRClient()).getListing(
      listingId,
    )
    if (!listing || !listing.active) {
      return { title: 'Edições — DestaquesGovBr' }
    }
    return {
      title: `Edições — ${listing.name} — DestaquesGovBr`,
    }
  } catch {
    return { title: 'Edições — DestaquesGovBr' }
  }
}

export default async function ReleasesPage({ params }: Props) {
  const { listingId } = await params
  const session = await auth()
  const client = createSSRClient(async () => session?.accessToken ?? null)

  const service = getMarketplaceService(client)
  const listing = await service.getListing(listingId)
  if (!listing || !listing.active) notFound()

  let initialReleases: Array<{
    id: string
    clippingName: string
    articlesCount: number
    createdAt: string
    releaseUrl: string
    refTime?: string | null
    sinceHours?: number | null
    digestPreview?: string
  }> = []
  let hasMoreReleases = false

  try {
    // Caminho PÚBLICO: `MarketplaceListing.releases` (público para listing
    // ativo, paginação por cursor `before`). NÃO usamos `clipping.releases`
    // (gated a autor/assinante → UNAUTHENTICATED para anônimo). O preview vem
    // no campo `digest` do `Release` (convenção do facade).
    const { releases, hasMore } = await service.listListingReleases(listingId, {
      limit: 20,
    })
    initialReleases = releases.map((r) => ({
      id: r.id,
      clippingName: r.clippingName || listing.name,
      articlesCount: r.articlesCount,
      createdAt: r.createdAt,
      releaseUrl: r.releaseUrl || `/clipping/release/${r.id}`,
      refTime: r.refTime ?? null,
      sinceHours: r.sinceHours ?? null,
      digestPreview: r.digest || undefined,
    }))
    hasMoreReleases = hasMore
  } catch (error) {
    console.error('Failed to load releases:', error)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight mb-2">
        Edições — {listing.name}
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Todas as edições publicadas deste clipping
      </p>

      <ReleaseList
        listingId={listingId}
        initialReleases={initialReleases}
        hasMore={hasMoreReleases}
        showAllCards
      />
    </div>
  )
}
