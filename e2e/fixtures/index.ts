/**
 * Barrel das fixtures E2E da suíte GraphQL.
 *
 * Uso típico num spec:
 *   import { createE2EGraphQLClient, makeClipping, removeClipping } from '../fixtures'
 */

export {
  type CreatedClipping,
  cleanupTestClippings,
  E2E_PREFIX,
  type MakeClippingOptions,
  makeClipping,
  removeClipping,
} from './clipping.fixture'
export {
  createE2EGraphQLClient,
  type E2EGraphQLClient,
  graphqlApiUrl,
} from './graphql-client'
export {
  decodeJwtPayload,
  fetchBotAccessToken,
  type KeycloakTokenResponse,
  keycloakUrl,
} from './keycloak'
export {
  type CreatedListing,
  publishListing,
  unpublishListing,
} from './listing.fixture'
export { assertDataPreconditions } from './seed'
