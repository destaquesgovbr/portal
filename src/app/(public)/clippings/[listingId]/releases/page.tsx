import { notFound } from 'next/navigation'
import { ReleaseList } from '@/components/clipping/ReleaseList'
import { getFirestoreDb } from '@/lib/firebase-admin'

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
      return { title: 'Edições — DestaquesGovBr' }
    }
    return {
      title: `Edições — ${snap.data()!.name} — DestaquesGovBr`,
    }
  } catch {
    return { title: 'Edições — DestaquesGovBr' }
  }
}

export default async function ReleasesPage({ params }: Props) {
  const { listingId } = await params
  const db = getFirestoreDb()

  const listingSnap = await db.collection('marketplace').doc(listingId).get()
  if (!listingSnap.exists || !listingSnap.data()?.active) notFound()

  const listing = listingSnap.data()!

  let initialReleases: Array<{
    id: string
    clippingName: string
    articlesCount: number
    createdAt: string
    releaseUrl: string
    refTime?: string | null
    sinceHours?: number | null
    digestPreview?: string
  }> = []
  let hasMoreReleases = false

  try {
    const releasesSnap = await db
      .collection('releases')
      .where('clippingId', '==', listing.sourceClippingId)
      .orderBy('createdAt', 'desc')
      .limit(21)
      .get()
    hasMoreReleases = releasesSnap.docs.length > 20
    initialReleases = releasesSnap.docs.slice(0, 20).map((doc) => {
      const d = doc.data()
      return {
        id: doc.id,
        clippingName: d.clippingName ?? listing.name,
        articlesCount: d.articlesCount ?? 0,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? '',
        releaseUrl: d.releaseUrl ?? `/clipping/release/${doc.id}`,
        refTime: d.refTime?.toDate?.()?.toISOString?.() ?? null,
        sinceHours: d.sinceHours ?? null,
        digestPreview: (() => {
          try {
            const parsed = JSON.parse(d.digest ?? '{}')
            return parsed.intro?.slice(0, 150) ?? ''
          } catch {
            return (d.digest ?? '').slice(0, 150)
          }
        })(),
      }
    })
  } catch (error) {
    console.error('Failed to load releases:', error)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight mb-2">
        Edições — {listing.name}
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Todas as edições publicadas deste clipping
      </p>

      <ReleaseList
        listingId={listingId}
        initialReleases={initialReleases}
        hasMore={hasMoreReleases}
        showAllCards
      />
    </div>
  )
}
