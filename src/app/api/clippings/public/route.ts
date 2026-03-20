import { type NextRequest, NextResponse } from 'next/server'
import { getFirestoreDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
    const limit = Math.max(
      1,
      Math.min(100, Number(searchParams.get('limit') ?? '12')),
    )
    const offset = (page - 1) * limit

    const db = getFirestoreDb()
    const marketplaceRef = db.collection('marketplace')

    const baseQuery = marketplaceRef.where('active', '==', true)

    const [snapshot, countSnapshot] = await Promise.all([
      baseQuery
        .orderBy('publishedAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get(),
      baseQuery.count().get(),
    ])

    const total = countSnapshot.data().count

    const listings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ listings, total })
  } catch (error) {
    console.error('Error listing marketplace:', error)
    return NextResponse.json(
      { error: 'Erro ao listar marketplace' },
      { status: 500 },
    )
  }
}
