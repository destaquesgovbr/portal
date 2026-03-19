'use server'

import { auth } from '@/auth'
import { requireAdmin } from '@/lib/admin'
import { sendEmail } from '@/lib/email'
import { renderWaitlistApprovalEmail } from '@/lib/email-templates'
import { getFirestoreDb } from '@/lib/firebase-admin'
import { generateInviteCode } from '@/lib/invite'
import { ResultError, withResult } from '@/lib/result'
import type { WaitlistEntry } from '@/types/invite'

interface InviteStats {
  totalInvites: number
  activeInvites: number
  usedInvites: number
  pendingWaitlist: number
  approvedWaitlist: number
}

export const getWaitlistEntries = withResult(
  async (statusFilter?: string): Promise<WaitlistEntry[]> => {
    await requireAdmin()

    const db = getFirestoreDb()
    let query = db.collection('waitlist').orderBy('submittedAt', 'desc')

    if (statusFilter) {
      query = db
        .collection('waitlist')
        .where('status', '==', statusFilter)
        .orderBy('submittedAt', 'desc')
    }

    const snapshot = await query.get()

    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        email: data.email as string,
        name: (data.name as string) ?? null,
        status: data.status as WaitlistEntry['status'],
        submittedAt: data.submittedAt as string,
        reviewedAt: (data.reviewedAt as string) ?? null,
        reviewedBy: (data.reviewedBy as string) ?? null,
        inviteCodeSent: (data.inviteCodeSent as string) ?? null,
      }
    })
  },
)

export const approveEntry = withResult(
  async (waitlistId: string): Promise<string> => {
    await requireAdmin()

    const session = await auth()
    const db = getFirestoreDb()

    const entryRef = db.collection('waitlist').doc(waitlistId)
    const entryDoc = await entryRef.get()

    if (!entryDoc.exists) {
      throw new ResultError('Entrada não encontrada')
    }

    const code = generateInviteCode()
    const batch = db.batch()

    batch.update(entryRef, {
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      reviewedBy: session?.user?.id ?? 'admin',
      inviteCodeSent: code,
    })

    batch.set(db.collection('inviteCodes').doc(code), {
      code,
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
      status: 'active',
      usedBy: null,
      usedAt: null,
    })

    await batch.commit()

    const data = entryDoc.data()!
    try {
      const html = renderWaitlistApprovalEmail({
        name: (data.name as string) ?? undefined,
        code,
        portalUrl:
          process.env.AUTH_URL ?? 'https://destaquesgovbr.gov.br',
      })
      await sendEmail({
        to: data.email as string,
        subject: 'Seu acesso ao Destaques Gov.br foi aprovado!',
        html,
      })
    } catch (error) {
      console.error('[waitlist] Failed to send approval email:', error)
    }

    return code
  },
)

export const rejectEntry = withResult(
  async (waitlistId: string): Promise<void> => {
    await requireAdmin()

    const session = await auth()
    const db = getFirestoreDb()

    const entryRef = db.collection('waitlist').doc(waitlistId)
    await entryRef.update({
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewedBy: session?.user?.id ?? 'admin',
    })
  },
)

export const getInviteStats = withResult(async (): Promise<InviteStats> => {
  await requireAdmin()

  const db = getFirestoreDb()

  const [invitesSnap, waitlistSnap] = await Promise.all([
    db.collection('inviteCodes').get(),
    db.collection('waitlist').get(),
  ])

  const invites = invitesSnap.docs.map((d) => d.data())
  const waitlist = waitlistSnap.docs.map((d) => d.data())

  return {
    totalInvites: invites.length,
    activeInvites: invites.filter((i) => i.status === 'active').length,
    usedInvites: invites.filter((i) => i.status === 'used').length,
    pendingWaitlist: waitlist.filter((w) => w.status === 'pending').length,
    approvedWaitlist: waitlist.filter((w) => w.status === 'approved').length,
  }
})
