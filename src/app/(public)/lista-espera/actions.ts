'use server'

import { getFirestoreDb } from '@/lib/firebase-admin'
import { ActionError, withActionState } from '@/types/action-state'
import { waitlistFormSchema } from '@/types/invite'

export const submitToWaitlist = withActionState<string, [FormData]>(
  async (formData: FormData) => {
    const raw = {
      email: formData.get('email'),
      name: formData.get('name') || undefined,
    }

    const parsed = waitlistFormSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ActionError('Email inválido')
    }

    const email = parsed.data.email.toLowerCase()
    const name = parsed.data.name?.trim() || null

    const db = getFirestoreDb()

    const existing = await db
      .collection('waitlist')
      .where('email', '==', email)
      .get()

    if (!existing.empty) {
      throw new ActionError('Este email já está na lista de espera')
    }

    await db.collection('waitlist').add({
      email,
      name,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      inviteCodeSent: null,
    })
  },
)
