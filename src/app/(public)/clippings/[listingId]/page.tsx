import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { ClippingDetailView } from '@/components/clipping/ClippingDetailView'
import { ListingActions } from '@/components/marketplace/ListingActions'
import { estimateTotalCount } from '@/lib/estimate-recorte-count'
import { getFirestoreDb } from '@/lib/firebase-admin'
import { resolveRecorteLabels } from '@/lib/recorte-utils'
import { fetchReleasesForClipping } from '@/lib/release-utils'
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
      description: data.shortDescription ?? data.description,
    }
  } catch {
    return { title: 'Marketplace — DestaquesGovBr' }
  }
}

export default async function ListingDetailPage({ params }: Props) {
  const { listingId } = await params
  const db = getFirestoreDb()

  const snap = await db.collection('marketplace').doc(listingId).get()
  if (!snap.exists || !snap.data()?.active) notFound()

  const data = snap.data()!
  const listing: MarketplaceListing = {
    id: snap.id,
    ...data,
    publishedAt: data.publishedAt?.toDate?.()?.toISOString?.() ?? '',
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? '',
  } as MarketplaceListing

  // User state (optional)
  let userFollows = false
  let userHasLiked = false
  let hasTelegram = false

  const session = await auth()
  if (session?.user?.id) {
    const userId = session.user.id
    const [likeSnap, followerSnap] = await Promise.all([
      db
        .collection('marketplace')
        .doc(listingId)
        .collection('likes')
        .doc(userId)
        .get(),
      db
        .collection('subscriptions')
        .where('clippingId', '==', listing.sourceClippingId)
        .where('userId', '==', userId)
        .where('role', '==', 'subscriber')
        .limit(1)
        .get(),
    ])
    userHasLiked = likeSnap.exists
    userFollows = !followerSnap.empty
    try {
      const tgDoc = await db
        .collection('users')
        .doc(userId)
        .collection('telegramLink')
        .doc('account')
        .get()
      hasTelegram = tgDoc.exists
    } catch {}
  }

  // Shared data
  const [resolvedRecortes, { releases, hasMore }, estimation] =
    await Promise.all([
      resolveRecorteLabels(listing.recortes),
      fetchReleasesForClipping(listing.sourceClippingId, listing.name),
      estimateTotalCount(listing.recortes).catch(() => ({
        total: 0,
        perRecorte: [],
      })),
    ])

  return (
    <ClippingDetailView
      name={listing.name}
      description={listing.description}
      schedule={listing.schedule}
      coverImageUrl={listing.coverImageUrl}
      authorDisplayName={listing.authorDisplayName}
      publishedAt={listing.publishedAt}
      recortes={resolvedRecortes}
      estimatedCount={estimation.total}
      perRecorteEstimates={estimation.perRecorte}
      releases={releases}
      hasMoreReleases={hasMore}
      releasesPagePath={`/clippings/${listing.id}/releases`}
      actions={
        <ListingActions
          listing={listing}
          userFollows={userFollows}
          userHasLiked={userHasLiked}
          hasTelegram={hasTelegram}
        />
      }
      feedLinks={{
        rss: `/api/clippings/public/${listing.id}/feed.xml`,
        json: `/api/clippings/public/${listing.id}/feed.json`,
      }}
    />
  )
}
