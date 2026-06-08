import { auth } from '@/auth'
import { getAgenciesList } from '@/data/agencies-utils'
import { getThemesWithHierarchy } from '@/data/themes-utils'
import { createSSRClient } from '@/lib/graphql/client'
import { getHasTelegram } from '@/lib/graphql/user'
import { NovoClippingClient } from './NovoClippingClient'

export default async function NovoClippingPage() {
  const [session, agencies, themes] = await Promise.all([
    auth(),
    getAgenciesList(),
    getThemesWithHierarchy(),
  ])

  let hasTelegram = false
  if (session?.user?.id) {
    const ssrClient = createSSRClient(async () => session.accessToken ?? null)
    hasTelegram = await getHasTelegram(ssrClient)
  }

  return (
    <NovoClippingClient
      agencies={agencies}
      themes={themes}
      hasTelegram={hasTelegram}
    />
  )
}
