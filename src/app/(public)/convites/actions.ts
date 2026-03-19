'use server'

import { auth } from '@/auth'
import { isAdmin } from '@/lib/admin'
import { getFirestoreDb } from '@/lib/firebase-admin'
import { generateInviteCode } from '@/lib/invite'
import { ResultError, withResult } from '@/lib/result'
import { type InviteCode, MAX_INVITES_PER_USER } from '@/types/invite'

interface UserInvitesData {
  inviteCount: number
  maxInvites: number
  codes: InviteCode[]
}

export const getUserInvites = withResult(async (): Promise<UserInvitesData> => {
  const session = await auth()
  if (!session?.user?.id) {
    throw new ResultError('Você precisa estar autenticado')
  }

  const db = getFirestoreDb()

  const userDoc = await db.collection('users').doc(session.user.id).get()
  const userData = userDoc.data()
  const inviteCount = (userData?.inviteCount as number) ?? 0
  const admin = await isAdmin()

  const codesSnapshot = await db
    .collection('inviteCodes')
    .where('createdBy', '==', session.user.id)
    .orderBy('createdAt', 'desc')
    .get()

  const codes: InviteCode[] = codesSnapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      code: data.code as string,
      createdBy: data.createdBy as string,
      createdAt: data.createdAt as string,
      status: data.status as InviteCode['status'],
      usedBy: (data.usedBy as string) ?? null,
      usedAt: (data.usedAt as string) ?? null,
    }
  })

  return {
    inviteCount,
    maxInvites: admin ? Infinity : MAX_INVITES_PER_USER,
    codes,
  }
})

export const createInviteCode = withResult(async (): Promise<string> => {
  const session = await auth()
  if (!session?.user?.id) {
    throw new ResultError('Você precisa estar autenticado')
  }

  const db = getFirestoreDb()
  const userRef = db.collection('users').doc(session.user.id)

  const userDoc = await userRef.get()
  const userData = userDoc.data()
  const currentCount = (userData?.inviteCount as number) ?? 0
  const admin = await isAdmin()

  if (!admin && currentCount >= MAX_INVITES_PER_USER) {
    throw new ResultError(
      `Você já atingiu o limite de ${MAX_INVITES_PER_USER} convites`,
    )
  }

  const code = generateInviteCode()
  const batch = db.batch()

  batch.set(db.collection('inviteCodes').doc(code), {
    code,
    createdBy: session.user.id,
    createdAt: new Date().toISOString(),
    status: 'active',
    usedBy: null,
    usedAt: null,
  })

  batch.update(userRef, {
    inviteCount: currentCount + 1,
  })

  await batch.commit()
  return code
})

export const revokeInviteCode = withResult(
  async (code: string): Promise<void> => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new ResultError('Você precisa estar autenticado')
    }

    const db = getFirestoreDb()
    const inviteRef = db.collection('inviteCodes').doc(code)
    const inviteDoc = await inviteRef.get()

    if (!inviteDoc.exists) {
      throw new ResultError('Código de convite não encontrado')
    }

    const data = inviteDoc.data() as InviteCode
    if (data.createdBy !== session.user.id) {
      throw new ResultError('Você não pode revogar este convite')
    }

    if (data.status !== 'active') {
      throw new ResultError('Apenas convites ativos podem ser revogados')
    }

    await inviteRef.update({ status: 'revoked' })
  },
)
