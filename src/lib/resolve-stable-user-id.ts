import { getFirestoreDb } from '@/lib/firebase-admin'
import { normalizeEmail } from '@/lib/normalize-email'

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
  const normalized = normalizeEmail(email)
  console.log(
    `[resolveStableUserId] email=${email} normalized=${normalized} providerSub=${providerSub}`,
  )
  try {
    const db = getFirestoreDb()
    const snapshot = await db
      .collection('users')
      .where('email', '==', normalized)
      .limit(1)
      .get()

    if (!snapshot.empty) {
      const stableId = snapshot.docs[0].id
      console.log(`[resolveStableUserId] FOUND existing user: ${stableId}`)
      return stableId
    }

    console.log(
      `[resolveStableUserId] NOT FOUND — creating users/${providerSub}`,
    )
    // First login — create user doc so the next provider finds it by email
    await db
      .collection('users')
      .doc(providerSub)
      .set({ email: normalized }, { merge: true })
  } catch (error) {
    console.error('[resolveStableUserId] ERROR:', error)
  }
  return providerSub
}
