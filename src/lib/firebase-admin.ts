import { type App, cert, getApps, initializeApp } from 'firebase-admin/app'
import { type Firestore, getFirestore } from 'firebase-admin/firestore'

function getApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  // In Cloud Run, uses Application Default Credentials automatically.
  // For local dev, set GOOGLE_APPLICATION_CREDENTIALS env var.
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    return initializeApp({ credential: cert(serviceAccount) })
  }

  return initializeApp()
}

export function getFirestoreDb(): Firestore {
  return getFirestore(getApp())
}
