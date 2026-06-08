import Link from 'next/link'
import { auth } from '@/auth'
import { FollowCard } from '@/components/marketplace/FollowCard'
import { getAgenciesList } from '@/data/agencies-utils'
import { getThemesWithHierarchy } from '@/data/themes-utils'
import { createSSRClient } from '@/lib/graphql/client'
import { getHasTelegram } from '@/lib/graphql/user'
import { createGraphQLClippingService } from '@/services/clipping/graphql'
import { createGraphQLMarketplaceService } from '@/services/marketplace/graphql'
import type { Clipping } from '@/types/clipping'
import { ClippingListClient } from './ClippingListClient'

export async function getClippings(): Promise<Clipping[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  // GraphQL é o único caminho de leitura. Em caso de falha, retorna lista
  // vazia (degradação graciosa — sem fallback REST/Firestore).
  try {
    const client = createSSRClient(async () => session.accessToken ?? null)
    return await createGraphQLClippingService(client).listClippings()
  } catch (error) {
    console.error('Error reading clippings:', error)
    return []
  }
}

export default async function ClippingPage() {
  const session = await auth()
  const userId = session?.user?.id
  const ssrClient = createSSRClient(async () => session?.accessToken ?? null)

  const [clippings, themes, agencies, follows, hasTelegram] = await Promise.all(
    [
      getClippings(),
      getThemesWithHierarchy(),
      getAgenciesList(),
      userId
        ? createGraphQLMarketplaceService(ssrClient).listFollowedListings()
        : Promise.resolve([]),
      userId ? getHasTelegram(ssrClient) : Promise.resolve(false),
    ],
  )
  const themeMap = Object.fromEntries(themes.map((t) => [t.key, t.name]))
  const agencyMap = Object.fromEntries(agencies.map((a) => [a.key, a.name]))

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Meus Clippings</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/minha-conta/clipping/novo"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            + Novo Clipping
          </Link>
        </div>
      </div>

      <ClippingListClient
        initialClippings={clippings}
        themeMap={themeMap}
        agencyMap={agencyMap}
      />

      {follows.length > 0 && (
        <>
          <h2 className="text-xl font-bold mt-12 mb-6">Clippings que sigo</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {follows.map((f) => (
              <FollowCard
                key={f.listingId}
                follow={f}
                hasTelegram={hasTelegram}
              />
            ))}
          </div>
        </>
      )}
    </main>
  )
}
