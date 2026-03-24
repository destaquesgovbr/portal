import Link from 'next/link'
import { auth } from '@/auth'
import {
  FollowCard,
  type FollowedListing,
} from '@/components/marketplace/FollowCard'
import { getAgenciesList } from '@/data/agencies-utils'
import { getThemesWithHierarchy } from '@/data/themes-utils'
import { getFirestoreDb } from '@/lib/firebase-admin'
import type { Clipping, MarketplaceListing } from '@/types/clipping'
import { ClippingListClient } from './ClippingListClient'

export async function getClippings(): Promise<Clipping[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  try {
    const db = getFirestoreDb()
    const snapshot = await db
      .collection('users')
      .doc(session.user.id)
      .collection('clippings')
      .orderBy('createdAt', 'desc')
      .get()

    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? '',
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? '',
      }
    }) as Clipping[]
  } catch (error) {
    console.error('Error reading clippings:', error)
    return []
  }
}

async function getFollows(userId: string): Promise<FollowedListing[]> {
  try {
    const db = getFirestoreDb()
    const followsSnap = await db
      .collectionGroup('followers')
      .where('userId', '==', userId)
      .get()

    const follows = await Promise.all(
      followsSnap.docs.map(async (doc) => {
        const data = doc.data()
        const listingId = doc.ref.parent.parent!.id
        const listingSnap = await db
          .collection('marketplace')
          .doc(listingId)
          .get()
        if (!listingSnap.exists) return null
        const listingData = listingSnap.data()!
        return {
          listingId,
          listing: {
            id: listingId,
            ...listingData,
            publishedAt:
              listingData.publishedAt?.toDate?.()?.toISOString?.() ?? '',
            updatedAt: listingData.updatedAt?.toDate?.()?.toISOString?.() ?? '',
          } as MarketplaceListing,
          deliveryChannels: data.deliveryChannels,
          extraEmails: data.extraEmails ?? [],
          webhookUrl: data.webhookUrl ?? '',
          followedAt: data.followedAt?.toDate?.()?.toISOString?.() ?? '',
        } satisfies FollowedListing
      }),
    )

    return follows.filter(Boolean) as FollowedListing[]
  } catch (error) {
    console.error('Error reading follows:', error)
    return []
  }
}

async function getHasTelegram(userId: string): Promise<boolean> {
  try {
    const db = getFirestoreDb()
    const tgDoc = await db
      .collection('users')
      .doc(userId)
      .collection('telegramLink')
      .doc('account')
      .get()
    return tgDoc.exists
  } catch {
    return false
  }
}

export default async function ClippingPage() {
  const session = await auth()
  const userId = session?.user?.id

  const [clippings, themes, agencies, follows, hasTelegram] = await Promise.all(
    [
      getClippings(),
      getThemesWithHierarchy(),
      getAgenciesList(),
      userId ? getFollows(userId) : Promise.resolve([]),
      userId ? getHasTelegram(userId) : Promise.resolve(false),
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
            href="/clippings"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Explorar Clippings Públicos
          </Link>
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
