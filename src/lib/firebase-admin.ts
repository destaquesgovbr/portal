import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

let app: App

function getApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  // In Cloud Run, uses Application Default Credentials automatically.
  // For local dev, set GOOGLE_APPLICATION_CREDENTIALS env var.
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    app = initializeApp({ credential: cert(serviceAccount) })
  } else {
    app = initializeApp()
  }

  return app
}

export function getFirestoreDb(): Firestore {
  return getFirestore(getApp())
}
