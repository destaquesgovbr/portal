import { auth } from '@/auth'
import { getAgenciesList } from '@/data/agencies-utils'
import { getThemesWithHierarchy } from '@/data/themes-utils'
import { createSSRClient } from '@/lib/graphql/client'
import { getHasTelegram } from '@/lib/graphql/user'
import { EditarClippingClient } from './EditarClippingClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarClippingPage({ params }: Props) {
  const { id } = await params
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
    <EditarClippingClient
      id={id}
      agencies={agencies}
      themes={themes}
      hasTelegram={hasTelegram}
    />
  )
}
