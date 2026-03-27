import { getFirestoreDb } from '@/lib/firebase-admin'
import { normalizeEmail } from '@/lib/normalize-email'

/**
 * Resolve a stable user ID and role from Firestore based on email.
 * If a user doc with this email already exists, return its ID and role.
 * Otherwise, create a user doc with role 'user' and return the provider's sub.
 * This prevents duplicate user docs when the same email logs in
 * via different providers or deployments.
 */
export async function resolveStableUser(
  email: string,
  providerSub: string,
): Promise<{ userId: string; role: string }> {
  const normalized = normalizeEmail(email)
  try {
    const db = getFirestoreDb()
    const snapshot = await db
      .collection('users')
      .where('email', '==', normalized)
      .limit(1)
      .get()

    if (!snapshot.empty) {
      const doc = snapshot.docs[0]
      return { userId: doc.id, role: doc.data().role ?? 'user' }
    }

    // First login — create user doc so the next provider finds it by email
    await db
      .collection('users')
      .doc(providerSub)
      .set({ email: normalized, role: 'user' }, { merge: true })
  } catch (error) {
    console.error('Failed to resolve stable user:', error)
  }
  return { userId: providerSub, role: 'user' }
}
