import { auth } from '@/auth'
import { MarketplaceCard } from '@/components/marketplace/MarketplaceCard'
import { getFirestoreDb } from '@/lib/firebase-admin'
import type { MarketplaceListing } from '@/types/clipping'

export const revalidate = 600

export default async function MarketplacePage() {
  const session = await auth()
  const userId = session?.user?.id
  let listings: MarketplaceListing[] = []

  try {
    const db = getFirestoreDb()
    let snapshot: FirebaseFirestore.QuerySnapshot
    try {
      snapshot = await db
        .collection('marketplace')
        .where('active', '==', true)
        .orderBy('publishedAt', 'desc')
        .limit(12)
        .get()
    } catch {
      snapshot = await db
        .collection('marketplace')
        .where('active', '==', true)
        .limit(50)
        .get()
    }
    listings = snapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          publishedAt: data.publishedAt?.toDate?.()?.toISOString?.() ?? '',
          updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? '',
        } as MarketplaceListing
      })
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
      .slice(0, 12)
  } catch (error) {
    console.error('Failed to load marketplace:', error)
  }

  // Fetch user's follows and likes for all visible listings
  let followedIds = new Set<string>()
  let likedIds = new Set<string>()

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
    followedIds = new Set(
      results.filter((r) => r.follows).map((r) => r.listingId),
    )
    likedIds = new Set(results.filter((r) => r.liked).map((r) => r.listingId))
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Prateleira de Clippings
        </h1>
        <p className="mt-2 text-muted-foreground">
          Descubra e siga clippings criados pela comunidade
        </p>
      </div>

      {listings.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          Nenhum clipping publicado ainda
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <MarketplaceCard
              key={listing.id}
              listing={listing}
              isFollowing={followedIds.has(listing.id)}
              isLiked={likedIds.has(listing.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
