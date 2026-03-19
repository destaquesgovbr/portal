import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { isAdmin } from '@/lib/admin'
import { getFirestoreDb } from '@/lib/firebase-admin'

export default async function AdminCallbackPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/convite')
  }

  const admin = await isAdmin()
  if (!admin) {
    redirect('/convite')
  }

  // Create admin user profile in Firestore if it doesn't exist
  const db = getFirestoreDb()
  const userRef = db.collection('users').doc(session.user.id)
  const userDoc = await userRef.get()

  if (!userDoc.exists) {
    await userRef.set({
      invitedBy: null,
      inviteCode: null,
      inviteCount: 0,
      joinedAt: new Date().toISOString(),
      role: 'admin',
      name: session.user.name ?? null,
      email: session.user.email ?? null,
    })
  }

  redirect('/')
}
