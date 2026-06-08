import { auth } from '@/auth'
import { getThemeNameByCode } from '@/data/themes-utils'
import { createSSRClient } from '@/lib/graphql/client'
import {
  MARKETPLACE_LISTINGS_QUERY,
  type MarketplaceListingGraphQL,
  type MarketplaceListingsQueryData,
} from '@/lib/graphql/queries/marketplace'
import type { MarketplaceListing } from '@/types/clipping'
import { ClippingsPageClient } from './ClippingsPageClient'

export const revalidate = 600

export type ThemeChip = { code: string; label: string; count: number }

/** Trava de segurança contra loop infinito caso `total` venha inconsistente. */
const MAX_PAGES = 50

function mapListing(node: MarketplaceListingGraphQL): MarketplaceListing {
  return {
    id: node.id,
    authorUserId: node.authorUserId,
    authorDisplayName: node.authorDisplayName,
    sourceClippingId: node.sourceClippingId,
    name: node.name,
    description: node.description ?? '',
    recortes: node.recortes.map((r) => ({
      id: r.id,
      title: r.title,
      themes: r.themes ?? [],
      agencies: r.agencies ?? [],
      keywords: r.keywords ?? [],
    })),
    prompt: node.prompt ?? '',
    schedule: node.schedule ?? undefined,
    likeCount: node.likeCount,
    followerCount: node.followerCount,
    cloneCount: node.cloneCount,
    publishedAt: node.publishedAt ?? '',
    updatedAt: node.updatedAt ?? '',
    active: node.active,
  }
}

export default async function MarketplacePage() {
  const session = await auth()
  let listings: MarketplaceListing[] = []
  let followedIds: string[] = []
  let likedIds: string[] = []

  try {
    // Caminho público; se logado, o token habilita `hasLiked`/`hasFollowed`.
    const client = createSSRClient(async () => session?.accessToken ?? null)

    // A galeria precisa de TODAS as listings ativas (deriva os theme-chips do
    // conjunto completo e filtra client-side). O resolver `marketplaceListings`
    // é paginado e a operação não aceita `limit`, então acumulamos páginas até
    // termos buscado o `total` reportado (com trava `MAX_PAGES`).
    const nodes: MarketplaceListingGraphQL[] = []
    let page = 1
    let total = Number.POSITIVE_INFINITY
    while (nodes.length < total && page <= MAX_PAGES) {
      const result = await client
        .query<MarketplaceListingsQueryData>(MARKETPLACE_LISTINGS_QUERY, {
          page,
        })
        .toPromise()
      if (result.error) {
        throw result.error
      }
      const data = result.data?.marketplaceListings
      const pageNodes = data?.listings ?? []
      total = data?.total ?? nodes.length + pageNodes.length
      nodes.push(...pageNodes)
      // Página vazia → não há mais o que buscar (evita loop se `total` mentir).
      if (pageNodes.length === 0) break
      page += 1
    }

    listings = nodes.map(mapListing)
    // `hasLiked`/`hasFollowed` vêm do schema (resolvidos para o usuário logado),
    // substituindo o batch manual por-usuário de likes/follows do Firestore.
    followedIds = nodes.filter((n) => n.hasFollowed).map((n) => n.id)
    likedIds = nodes.filter((n) => n.hasLiked).map((n) => n.id)
  } catch (error) {
    console.error('Failed to load marketplace:', error)
  }

  // Calculate theme chips from all listings
  const themeCounts = new Map<string, number>()
  for (const listing of listings) {
    for (const recorte of listing.recortes) {
      for (const theme of recorte.themes) {
        themeCounts.set(theme, (themeCounts.get(theme) ?? 0) + 1)
      }
    }
  }
  const topThemes = [...themeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  const themeChips: ThemeChip[] = await Promise.all(
    topThemes.map(async ([code, count]) => ({
      code,
      label: (await getThemeNameByCode(code)) ?? code,
      count,
    })),
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Galeria de Clippings
        </h1>
        <p className="mt-2 text-muted-foreground">
          Descubra e siga clippings criados pela comunidade
        </p>
      </div>

      <ClippingsPageClient
        listings={listings}
        themeChips={themeChips}
        followedIds={followedIds}
        likedIds={likedIds}
      />
    </div>
  )
}
