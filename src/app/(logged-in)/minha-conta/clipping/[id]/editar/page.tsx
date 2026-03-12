import { getAgenciesList } from '@/data/agencies-utils'
import { getThemesWithHierarchy } from '@/data/themes-utils'
import { EditarClippingClient } from './EditarClippingClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarClippingPage({ params }: Props) {
  const { id } = await params
  const [agencies, themes] = await Promise.all([
    getAgenciesList(),
    getThemesWithHierarchy(),
  ])

  return <EditarClippingClient id={id} agencies={agencies} themes={themes} />
}
