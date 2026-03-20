import { MarketplaceCard } from '@/components/marketplace/MarketplaceCard'
import { getFirestoreDb } from '@/lib/firebase-admin'
import type { MarketplaceListing } from '@/types/clipping'

export const revalidate = 600

export default async function MarketplacePage() {
  let listings: MarketplaceListing[] = []
  try {
    const db = getFirestoreDb()
    let snapshot: FirebaseFirestore.QuerySnapshot
    try {
      // Composite index: active + publishedAt (preferred)
      snapshot = await db
        .collection('marketplace')
        .where('active', '==', true)
        .orderBy('publishedAt', 'desc')
        .limit(12)
        .get()
    } catch {
      // Fallback: query without composite index, filter in memory
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Marketplace de Clippings
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
            <MarketplaceCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}
