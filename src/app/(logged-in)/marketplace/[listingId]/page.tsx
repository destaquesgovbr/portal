import { Copy, Heart, Users } from 'lucide-react'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { ListingActions } from '@/components/marketplace/ListingActions'
import { Badge } from '@/components/ui/badge'
import { getFirestoreDb } from '@/lib/firebase-admin'
import type { MarketplaceListing } from '@/types/clipping'

export const revalidate = 600

interface Props {
  params: Promise<{ listingId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { listingId } = await params
  try {
    const db = getFirestoreDb()
    const snap = await db.collection('marketplace').doc(listingId).get()

    if (!snap.exists || !snap.data()?.active) {
      return { title: 'Listing não encontrado — DestaquesGovBr' }
    }

    const data = snap.data()!
    return {
      title: `${data.name} — Marketplace — DestaquesGovBr`,
      description: data.description,
    }
  } catch (error) {
    console.error('Failed to load listing metadata:', error)
    return { title: 'Marketplace — DestaquesGovBr' }
  }
}

export default async function ListingDetailPage({ params }: Props) {
  const { listingId } = await params

  let listing: MarketplaceListing
  let userFollowsId: string | null = null
  let userHasLiked = false

  try {
    const db = getFirestoreDb()
    const snap = await db.collection('marketplace').doc(listingId).get()

    if (!snap.exists) {
      notFound()
    }

    const data = snap.data()!

    if (!data.active) {
      notFound()
    }

    listing = {
      id: snap.id,
      ...data,
      publishedAt: data.publishedAt?.toDate?.()?.toISOString?.() ?? '',
      updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? '',
    } as MarketplaceListing

    // Check if user is authenticated for personalized state
    const session = await auth()
    if (session?.user?.id) {
      const userId = session.user.id

      const [likeSnap, followSnap] = await Promise.all([
        db
          .collection('marketplace')
          .doc(listingId)
          .collection('likes')
          .doc(userId)
          .get(),
        db
          .collection('users')
          .doc(userId)
          .collection('clippings')
          .where('followsListingId', '==', listingId)
          .limit(1)
          .get(),
      ])

      userHasLiked = likeSnap.exists
      userFollowsId = followSnap.empty ? null : followSnap.docs[0].id
    }
  } catch (error) {
    console.error('Failed to load listing:', error)
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight">{listing.name}</h1>

      <p className="mt-1 text-sm text-muted-foreground">
        Por {listing.authorDisplayName}
      </p>

      {listing.description && (
        <p className="mt-4 text-base leading-relaxed">{listing.description}</p>
      )}

      {/* Stats */}
      <div className="mt-4 flex items-center gap-5 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Heart className="h-4 w-4" />
          {listing.likeCount}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          {listing.followerCount}
        </span>
        <span className="flex items-center gap-1.5">
          <Copy className="h-4 w-4" />
          {listing.cloneCount}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-6">
        <ListingActions
          listing={listing}
          userFollowsId={userFollowsId}
          userHasLiked={userHasLiked}
        />
      </div>

      {/* Recortes */}
      {listing.recortes.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Recortes</h2>
          <div className="space-y-4">
            {listing.recortes.map((recorte) => (
              <div key={recorte.id} className="border rounded-md p-4 space-y-2">
                <h3 className="text-base font-medium">
                  {recorte.title ?? `Recorte ${recorte.id.slice(0, 4)}`}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {recorte.themes.map((theme) => (
                    <Badge key={theme} variant="secondary" className="text-xs">
                      {theme}
                    </Badge>
                  ))}
                  {recorte.agencies.map((agency) => (
                    <Badge key={agency} variant="outline" className="text-xs">
                      {agency}
                    </Badge>
                  ))}
                  {recorte.keywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      className="text-xs bg-muted text-muted-foreground"
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
