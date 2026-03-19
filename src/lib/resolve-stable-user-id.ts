import { getFirestoreDb } from '@/lib/firebase-admin'

/**
 * Resolve a stable user ID from Firestore based on email.
 * If a user doc with this email already exists, return its ID.
 * Otherwise, return the provider's sub as the new user ID.
 * This prevents duplicate user docs when the same email logs in
 * via different providers or deployments.
 */
export async function resolveStableUserId(
  email: string,
  providerSub: string,
): Promise<string> {
  try {
    const db = getFirestoreDb()
    const snapshot = await db
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get()

    if (!snapshot.empty) {
      return snapshot.docs[0].id
    }
  } catch (error) {
    console.error('Failed to resolve stable user ID:', error)
  }
  return providerSub
}
