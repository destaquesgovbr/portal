import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { isAdmin } from '@/lib/admin'
import { getFirestoreDb } from '@/lib/firebase-admin'

export default async function PostLoginPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/convite')

  const db = getFirestoreDb()
  const userDoc = await db.collection('users').doc(session.user.id).get()

  if (userDoc.exists) redirect('/')

  if (await isAdmin()) {
    await db
      .collection('users')
      .doc(session.user.id)
      .set({
        invitedBy: null,
        inviteCode: null,
        inviteCount: 0,
        joinedAt: new Date().toISOString(),
        role: 'admin',
        name: session.user.name ?? null,
        email: session.user.email ?? null,
      })
    redirect('/')
  }

  redirect('/convite')
}
