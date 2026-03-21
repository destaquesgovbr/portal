import { z } from 'zod'
import { isValidCron } from '@/lib/cron-utils'

export const RecorteSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1, 'Título do recorte é obrigatório').max(100),
    themes: z.array(z.string()),
    agencies: z.array(z.string()),
    keywords: z.array(z.string().max(100)),
  })
  .refine(
    (r) =>
      r.themes.length > 0 || r.agencies.length > 0 || r.keywords.length > 0,
    { message: 'Recorte must have at least one filter' },
  )

export const ClippingPayloadSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  recortes: z.array(RecorteSchema).min(1),
  prompt: z.string().max(2000),
  schedule: z.string().refine((v) => isValidCron(v), 'Expressão cron inválida'),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  deliveryChannels: z.object({
    email: z.boolean(),
    telegram: z.boolean(),
    push: z.boolean(),
    webhook: z.boolean().optional().default(false),
  }),
  active: z.boolean(),
  extraEmails: z.array(z.string().email()).max(3).default([]),
  webhookUrl: z.string().url().optional().or(z.literal('')).default(''),
  includeHistory: z.boolean().optional().default(false),
})

export const PublishToMarketplaceSchema = z.object({
  clippingId: z.string().min(1),
  description: z
    .string()
    .min(1, 'Descrição é obrigatória para publicar')
    .max(500),
})

export const FollowListingSchema = z.object({
  schedule: z.string().refine((v) => isValidCron(v), 'Expressão cron inválida'),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  deliveryChannels: z.object({
    email: z.boolean(),
    telegram: z.boolean(),
    push: z.boolean(),
    webhook: z.boolean().optional().default(false),
  }),
})
