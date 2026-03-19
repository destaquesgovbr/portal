import { z } from 'zod'

export const inviteCodeSchema = z.object({
  code: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
  status: z.enum(['active', 'used', 'revoked']),
  usedBy: z.string().nullable(),
  usedAt: z.string().nullable(),
})

export type InviteCode = z.infer<typeof inviteCodeSchema>

export const userProfileSchema = z.object({
  invitedBy: z.string().nullable(),
  inviteCode: z.string().nullable(),
  inviteCount: z.number().int().min(0),
  joinedAt: z.string(),
  role: z.enum(['user', 'admin']),
})

export type UserProfile = z.infer<typeof userProfileSchema>

export const waitlistEntrySchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  status: z.enum(['pending', 'approved', 'rejected']),
  submittedAt: z.string(),
  reviewedAt: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  inviteCodeSent: z.string().nullable(),
})

export type WaitlistEntry = z.infer<typeof waitlistEntrySchema>

export const waitlistFormSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().optional(),
})

export type WaitlistFormData = z.infer<typeof waitlistFormSchema>

export const MAX_INVITES_PER_USER = 5
