'use server'

import { auth } from '@/auth'
import { getFirestoreDb } from '@/lib/firebase-admin'
import { ResultError, withResult } from '@/lib/result'
import type { InviteCode } from '@/types/invite'

interface ValidatedInvite {
  code: string
  status: string
  inviterName: string | null
}

export const validateInviteCode = withResult(
  async (code: string): Promise<ValidatedInvite> => {
    const db = getFirestoreDb()
    const doc = await db.collection('inviteCodes').doc(code).get()

    if (!doc.exists) {
      throw new ResultError('Código de convite não encontrado')
    }

    const data = doc.data() as InviteCode
    if (data.status !== 'active') {
      throw new ResultError(
        'Este código de convite já foi utilizado ou revogado',
      )
    }

    let inviterName: string | null = null
    try {
      const userDoc = await db.collection('users').doc(data.createdBy).get()
      if (userDoc.exists) {
        const userData = userDoc.data()
        inviterName = (userData?.name as string) ?? null
      }
    } catch {
      // Inviter name is optional
    }

    return {
      code: data.code,
      status: data.status,
      inviterName,
    }
  },
)

export const redeemInviteCode = withResult(
  async (code: string): Promise<void> => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new ResultError(
        'Você precisa estar autenticado para resgatar um convite',
      )
    }

    const db = getFirestoreDb()
    const inviteRef = db.collection('inviteCodes').doc(code)
    const userRef = db.collection('users').doc(session.user.id)

    await db.runTransaction(async (transaction) => {
      const inviteDoc = await transaction.get(inviteRef)

      if (!inviteDoc.exists) {
        throw new ResultError('Código de convite não encontrado')
      }

      const inviteData = inviteDoc.data() as InviteCode
      if (inviteData.status !== 'active') {
        throw new ResultError(
          'Este código de convite já foi utilizado ou revogado',
        )
      }

      transaction.update(inviteRef, {
        status: 'used',
        usedBy: session.user!.id,
        usedAt: new Date().toISOString(),
      })

      transaction.set(
        userRef,
        {
          invitedBy: inviteData.createdBy,
          inviteCode: code,
          inviteCount: 0,
          joinedAt: new Date().toISOString(),
          role: 'user',
        },
        { merge: true },
      )
    })
  },
)
