/**
 * Firestore utilities for user data operations.
 */
import { getFirebaseDb } from "./firebase-config";

export async function getUserPreferences(uid: string) {
  const db = getFirebaseDb();
  if (!db) return null;

  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data()?.preferences ?? null;
}

export async function setUserPreferences(
  uid: string,
  preferences: import("@/types/auth").UserPreferences,
) {
  const db = getFirebaseDb();
  if (!db) return;

  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "users", uid), { preferences }, { merge: true });
}

export async function getReadingHistory(uid: string, limit = 50) {
  const db = getFirebaseDb();
  if (!db) return [];

  const {
    collection,
    query,
    orderBy,
    limit: limitFn,
    getDocs,
  } = await import("firebase/firestore");
  const ref = collection(db, "users", uid, "reading_history");
  const q = query(ref, orderBy("readAt", "desc"), limitFn(limit));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uniqueId: d.id, ...d.data() }));
}

export async function recordArticleRead(
  uid: string,
  uniqueId: string,
  source: "push" | "feed" | "search",
) {
  const db = getFirebaseDb();
  if (!db) return;

  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "users", uid, "reading_history", uniqueId), {
    readAt: Math.floor(Date.now() / 1000),
    timeSpentSeconds: 0,
    source,
  });
}

export async function updateReadingTime(
  uid: string,
  uniqueId: string,
  seconds: number,
) {
  const db = getFirebaseDb();
  if (!db) return;

  const { doc, updateDoc } = await import("firebase/firestore");
  await updateDoc(doc(db, "users", uid, "reading_history", uniqueId), {
    timeSpentSeconds: seconds,
  });
}

export async function ensureUserProfile(
  uid: string,
  profile: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  },
) {
  const db = getFirebaseDb();
  if (!db) return;

  const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
  await setDoc(
    doc(db, "users", uid),
    {
      profile: {
        ...profile,
        role: "user",
        createdAt: serverTimestamp(),
      },
    },
    { merge: true },
  );
}
