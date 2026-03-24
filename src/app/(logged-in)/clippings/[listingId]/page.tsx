import { Copy, FileJson, Heart, Rss, Users } from 'lucide-react'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { ReleaseList } from '@/components/clipping/ReleaseList'
import { ListingActions } from '@/components/marketplace/ListingActions'
import { Badge } from '@/components/ui/badge'
import { getAgencyField } from '@/data/agencies-utils'
import { getThemeNameByCode } from '@/data/themes-utils'
import { getFirestoreDb } from '@/lib/firebase-admin'
import type { MarketplaceListing, Recorte } from '@/types/clipping'

async function resolveRecorteLabels(recortes: Recorte[]) {
  return Promise.all(
    recortes.map(async (r) => ({
      ...r,
      themeLabels: await Promise.all(
        r.themes.map((code) => getThemeNameByCode(code).then((l) => l ?? code)),
      ),
      agencyLabels: await Promise.all(
        r.agencies.map((key) =>
          getAgencyField(key, 'name').then((l) => l ?? key),
        ),
      ),
    })),
  )
}

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
  let userFollows = false
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

      const [likeSnap, followerSnap] = await Promise.all([
        db
          .collection('marketplace')
          .doc(listingId)
          .collection('likes')
          .doc(userId)
          .get(),
        db
          .collection('marketplace')
          .doc(listingId)
          .collection('followers')
          .doc(userId)
          .get(),
      ])

      userHasLiked = likeSnap.exists
      userFollows = followerSnap.exists
    }
  } catch (error) {
    console.error('Failed to load listing:', error)
    notFound()
  }

  const resolvedRecortes = await resolveRecorteLabels(listing.recortes)

  // Fetch initial releases for the listing
  let initialReleases: Array<{
    id: string
    clippingName: string
    articlesCount: number
    createdAt: string
    releaseUrl: string
  }> = []
  let hasMoreReleases = false
  try {
    const db = getFirestoreDb()
    const releasesSnap = await db
      .collection('releases')
      .where('clippingId', '==', listing.sourceClippingId)
      .orderBy('createdAt', 'desc')
      .limit(11)
      .get()
    hasMoreReleases = releasesSnap.docs.length > 10
    initialReleases = releasesSnap.docs.slice(0, 10).map((doc) => {
      const d = doc.data()
      return {
        id: doc.id,
        clippingName: d.clippingName ?? listing.name,
        articlesCount: d.articlesCount ?? 0,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? '',
        releaseUrl: d.releaseUrl ?? `/clipping/release/${doc.id}`,
      }
    })
  } catch (error) {
    console.error('Failed to load releases:', error)
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
          userFollows={userFollows}
          userHasLiked={userHasLiked}
        />
      </div>

      {/* Feed links */}
      <div className="mt-6 flex items-center gap-3">
        <a
          href={`/api/clippings/public/${listing.id}/feed.xml`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Rss className="h-4 w-4" />
          RSS
        </a>
        <a
          href={`/api/clippings/public/${listing.id}/feed.json`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <FileJson className="h-4 w-4" />
          JSON
        </a>
      </div>

      {/* Recortes */}
      {listing.recortes.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Recortes</h2>
          <div className="space-y-4">
            {resolvedRecortes.map((recorte) => (
              <div key={recorte.id} className="border rounded-md p-4 space-y-2">
                <h3 className="text-base font-medium">
                  {recorte.title ?? `Recorte ${recorte.id.slice(0, 4)}`}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {recorte.themeLabels.map((label, i) => (
                    <Badge key={recorte.themes[i]} className="text-xs">
                      {label}
                    </Badge>
                  ))}
                  {recorte.agencyLabels.map((label, i) => (
                    <Badge
                      key={recorte.agencies[i]}
                      className="text-xs border-border bg-background"
                    >
                      {label}
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
      {/* Releases */}
      <section className="mt-8">
        <ReleaseList
          listingId={listing.id}
          initialReleases={initialReleases}
          hasMore={hasMoreReleases}
        />
      </section>
    </div>
  )
}
