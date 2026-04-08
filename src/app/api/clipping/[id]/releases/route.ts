import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getFirestoreDb } from '@/lib/firebase-admin'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const { id: clippingId } = await params
    const db = getFirestoreDb()

    // Verify the clipping belongs to the user
    const clippingSnap = await db.collection('clippings').doc(clippingId).get()

    if (!clippingSnap.exists) {
      return NextResponse.json(
        { error: 'Clipping não encontrado' },
        { status: 404 },
      )
    }

    const clippingData = clippingSnap.data()!
    if (clippingData.authorUserId !== session.user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Parse pagination params
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(
      50,
      Math.max(1, Number(searchParams.get('limit')) || 10),
    )
    const offset = (page - 1) * limit

    // Query releases
    const releasesSnap = await db
      .collection('releases')
      .where('clippingId', '==', clippingId)
      .orderBy('createdAt', 'desc')
      .offset(offset)
      .limit(limit + 1)
      .get()

    const docs = releasesSnap.docs
    const hasMore = docs.length > limit
    const releaseDocs = hasMore ? docs.slice(0, limit) : docs

    const releases = releaseDocs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        clippingId: data.clippingId,
        clippingName: data.clippingName,
        articlesCount: data.articlesCount ?? 0,
        createdAt:
          data.createdAt && typeof data.createdAt.toDate === 'function'
            ? data.createdAt.toDate().toISOString()
            : (data.createdAt ?? ''),
        releaseUrl: data.releaseUrl ?? `/clipping/release/${doc.id}`,
        refTime:
          data.refTime && typeof data.refTime.toDate === 'function'
            ? data.refTime.toDate().toISOString()
            : (data.refTime ?? null),
        sinceHours: data.sinceHours ?? null,
      }
    })

    return NextResponse.json({ releases, hasMore })
  } catch (error) {
    console.error('Error fetching releases:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar edições' },
      { status: 500 },
    )
  }
}
