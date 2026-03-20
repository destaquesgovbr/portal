import { FieldValue } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getFirestoreDb } from '@/lib/firebase-admin'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ listingId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const { listingId } = await params
    const db = getFirestoreDb()

    // Fetch the listing
    const listingRef = db.collection('marketplace').doc(listingId)
    const listingSnap = await listingRef.get()

    if (!listingSnap.exists) {
      return NextResponse.json(
        { error: 'Listing não encontrado' },
        { status: 404 },
      )
    }

    const listingData = listingSnap.data()!

    if (!listingData.active) {
      return NextResponse.json(
        { error: 'Listing não encontrado' },
        { status: 404 },
      )
    }

    // Check if user already liked
    const likeRef = listingRef.collection('likes').doc(session.user.id)
    const likeSnap = await likeRef.get()

    const currentLikeCount = listingData.likeCount ?? 0

    if (likeSnap.exists) {
      // Remove like
      await likeRef.delete()
      const newCount = Math.max(0, currentLikeCount - 1)
      if (currentLikeCount > 0) {
        await listingRef.update({
          likeCount: FieldValue.increment(-1),
        })
      }
      return NextResponse.json({ liked: false, likeCount: newCount })
    }

    // Add like
    await likeRef.set({
      userId: session.user.id,
      createdAt: FieldValue.serverTimestamp(),
    })
    await listingRef.update({
      likeCount: FieldValue.increment(1),
    })

    return NextResponse.json({ liked: true, likeCount: currentLikeCount + 1 })
  } catch (error) {
    console.error('Error toggling like:', error)
    return NextResponse.json(
      { error: 'Erro ao curtir listing' },
      { status: 500 },
    )
  }
}
