import { getAgenciesList } from '@/data/agencies-utils'
import { getThemesWithHierarchy } from '@/data/themes-utils'
import { NovoClippingClient } from './NovoClippingClient'

export default async function NovoClippingPage() {
  const [agencies, themes] = await Promise.all([
    getAgenciesList(),
    getThemesWithHierarchy(),
  ])

  return <NovoClippingClient agencies={agencies} themes={themes} />
}
