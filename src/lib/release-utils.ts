import { auth } from '@/auth'
import { createSSRClient } from '@/lib/graphql/client'
import { createGraphQLClippingService } from '@/services/clipping/graphql'

export type ReleaseItem = {
  id: string
  clippingName: string
  articlesCount: number
  createdAt: string
  releaseUrl: string
  refTime?: string | null
  sinceHours?: number | null
  digestPreview?: string
}

/**
 * Busca as releases (edições) de um clipping via GraphQL (substitui o acesso
 * direto ao Firestore).
 *
 * **Contexto AUTOR/AUTENTICADO apenas.** Usa o facade
 * `clipping(id) { releases(limit, before) }`, que o graphql-api GATEIA a
 * autor/assinante (anônimo recebe UNAUTHENTICATED). Por isso esta função serve
 * só a página do dono (`/minha-conta/clipping/[id]`). Páginas PÚBLICAS do
 * marketplace devem usar `MarketplaceService.listListingReleases(listingId)`
 * (campo `MarketplaceListing.releases`, público para listing ativo).
 *
 * Monta um `createSSRClient` com o token da sessão. Paginação: o schema usa
 * cursor `before` (DateTime ISO) em vez de offset. Para a primeira página,
 * omitimos `before`; o `hasMore` vem do facade, que pede `limit + 1`
 * internamente e fatia o excedente. O `loadMore` do `ReleaseList` (client)
 * continua a paginação passando o `refTime`/`createdAt` da release mais antiga
 * como cursor.
 */
export async function fetchReleasesForClipping(
  clippingId: string,
  clippingName: string,
  limit = 10,
): Promise<{ releases: ReleaseItem[]; hasMore: boolean }> {
  const session = await auth()
  const client = createSSRClient(async () => session?.accessToken ?? null)

  const { releases, hasMore } = await createGraphQLClippingService(
    client,
  ).listReleases(clippingId, { limit })

  const items: ReleaseItem[] = releases.map((r) => ({
    id: r.id,
    clippingName: r.clippingName || clippingName,
    articlesCount: r.articlesCount,
    createdAt: r.createdAt,
    releaseUrl: r.releaseUrl || `/clipping/release/${r.id}`,
    refTime: r.refTime ?? null,
    sinceHours: r.sinceHours ?? null,
    // `digestPreview` agora vem computado do servidor (campo `Release.digestPreview`);
    // a derivação local (parse do digest) foi removida. O facade `listReleases`
    // carrega o preview no campo `digest` do `Release` (o tipo não tem campo
    // próprio para o preview).
    digestPreview: r.digest || undefined,
  }))

  return { releases: items, hasMore }
}
