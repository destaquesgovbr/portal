/**
 * Factory de listings de marketplace para testes E2E.
 *
 * Publica um clipping existente no marketplace e remove ao final. Usa as mesmas
 * mutations do portal (`publishToMarketplace`, `unpublishFromMarketplace`) —
 * ver `src/lib/graphql/queries/marketplace.ts`.
 *
 * Fluxo típico de um spec: `makeClipping()` → `publishListing()` → asserções →
 * `unpublishListing()` + `removeClipping()`.
 */

import { E2E_PREFIX } from './clipping.fixture'
import type { E2EGraphQLClient } from './graphql-client'

const PUBLISH = /* GraphQL */ `
  mutation PublishToMarketplace($clippingId: String!, $input: PublishInput!) {
    publishToMarketplace(clippingId: $clippingId, input: $input) {
      id
      name
      sourceClippingId
      likeCount
      followerCount
      cloneCount
      active
    }
  }
`

const UNPUBLISH = /* GraphQL */ `
  mutation UnpublishFromMarketplace($listingId: String!) {
    unpublishFromMarketplace(listingId: $listingId)
  }
`

export interface CreatedListing {
  id: string
  name: string
  sourceClippingId: string
  likeCount: number
  followerCount: number
  cloneCount: number
  active: boolean
}

/**
 * Publica um clipping no marketplace. O nome do listing herda o prefixo
 * `E2E_PREFIX` para limpeza. Lança se a mutation falhar.
 */
export async function publishListing(
  client: E2EGraphQLClient,
  clippingId: string,
  opts: { suffix?: string } = {},
): Promise<CreatedListing> {
  const suffix = opts.suffix ?? 'listing'
  const data = await client.execute<{
    publishToMarketplace: CreatedListing
  }>(PUBLISH, {
    clippingId,
    input: {
      name: `${E2E_PREFIX}${suffix}`,
      description: 'Listing de teste E2E — pode ser removido.',
    },
  })
  return data.publishToMarketplace
}

/** Remove um listing do marketplace pelo ID. */
export async function unpublishListing(
  client: E2EGraphQLClient,
  listingId: string,
): Promise<void> {
  await client.execute<{ unpublishFromMarketplace: boolean }>(UNPUBLISH, {
    listingId,
  })
}
