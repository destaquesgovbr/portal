import { auth } from '@/auth'
import { getThemeNameByCode } from '@/data/themes-utils'
import { getFirestoreDb } from '@/lib/firebase-admin'
import type { MarketplaceListing } from '@/types/clipping'
import { ClippingsPageClient } from './ClippingsPageClient'

export const revalidate = 600

export type ThemeChip = { code: string; label: string; count: number }

export default async function MarketplacePage() {
  const session = await auth()
  const userId = session?.user?.id
  let listings: MarketplaceListing[] = []

  try {
    const db = getFirestoreDb()
    const snapshot = await db
      .collection('marketplace')
      .where('active', '==', true)
      .orderBy('publishedAt', 'desc')
      .get()

    listings = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        publishedAt: data.publishedAt?.toDate?.()?.toISOString?.() ?? '',
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? '',
      } as MarketplaceListing
    })
  } catch (error) {
    console.error('Failed to load marketplace:', error)
  }

  // Calculate theme chips from all listings
  const themeCounts = new Map<string, number>()
  for (const listing of listings) {
    for (const recorte of listing.recortes) {
      for (const theme of recorte.themes) {
        themeCounts.set(theme, (themeCounts.get(theme) ?? 0) + 1)
      }
    }
  }
  const topThemes = [...themeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  const themeChips: ThemeChip[] = await Promise.all(
    topThemes.map(async ([code, count]) => ({
      code,
      label: (await getThemeNameByCode(code)) ?? code,
      count,
    })),
  )

  // Fetch user's follows and likes
  let followedIds: string[] = []
  let likedIds: string[] = []

  if (userId && listings.length > 0) {
    const db = getFirestoreDb()
    const checks = listings.map(async (listing) => {
      const [followerSnap, likeSnap] = await Promise.all([
        db
          .collection('subscriptions')
          .where('clippingId', '==', listing.sourceClippingId)
          .where('userId', '==', userId)
          .where('role', '==', 'subscriber')
          .limit(1)
          .get(),
        db
          .collection('marketplace')
          .doc(listing.id)
          .collection('likes')
          .doc(userId)
          .get(),
      ])
      return {
        listingId: listing.id,
        follows: !followerSnap.empty,
        liked: likeSnap.exists,
      }
    })
    const results = await Promise.all(checks)
    followedIds = results.filter((r) => r.follows).map((r) => r.listingId)
    likedIds = results.filter((r) => r.liked).map((r) => r.listingId)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Galeria de Clippings
        </h1>
        <p className="mt-2 text-muted-foreground">
          Descubra e siga clippings criados pela comunidade
        </p>
      </div>

      <ClippingsPageClient
        listings={listings}
        themeChips={themeChips}
        followedIds={followedIds}
        likedIds={likedIds}
      />
    </div>
  )
}
