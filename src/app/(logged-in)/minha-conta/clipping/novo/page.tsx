import { auth } from '@/auth'
import { getAgenciesList } from '@/data/agencies-utils'
import { getThemesWithHierarchy } from '@/data/themes-utils'
import { getFirestoreDb } from '@/lib/firebase-admin'
import { NovoClippingClient } from './NovoClippingClient'

export default async function NovoClippingPage() {
  const [session, agencies, themes] = await Promise.all([
    auth(),
    getAgenciesList(),
    getThemesWithHierarchy(),
  ])

  let hasTelegram = false
  if (session?.user?.id) {
    try {
      const db = getFirestoreDb()
      const doc = await db
        .collection('users')
        .doc(session.user.id)
        .collection('telegramLink')
        .doc('account')
        .get()
      hasTelegram = doc.exists
    } catch {
      // non-fatal — show as unlinked
    }
  }

  return (
    <NovoClippingClient
      agencies={agencies}
      themes={themes}
      hasTelegram={hasTelegram}
    />
  )
}
