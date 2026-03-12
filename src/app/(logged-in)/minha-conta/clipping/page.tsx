import Link from 'next/link'
import { auth } from '@/auth'
import { getFirestoreDb } from '@/lib/firebase-admin'
import type { Clipping } from '@/types/clipping'
import { ClippingListClient } from './ClippingListClient'

async function getClippings(): Promise<Clipping[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  try {
    const db = getFirestoreDb()
    const snapshot = await db
      .collection('users')
      .doc(session.user.id)
      .collection('clippings')
      .orderBy('createdAt', 'desc')
      .get()

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Clipping[]
  } catch (error) {
    console.error('Error reading clippings:', error)
    return []
  }
}

export default async function ClippingPage() {
  const clippings = await getClippings()

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Meus Clippings</h1>
        <Link
          href="/minha-conta/clipping/novo"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + Novo Clipping
        </Link>
      </div>

      <ClippingListClient initialClippings={clippings} />
    </main>
  )
}
