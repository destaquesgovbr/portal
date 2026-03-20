import { z } from 'zod'

export const RecorteSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().max(100).optional(),
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
  scheduleTime: z.string().regex(/^([01]\d|2[0-3]):[03]0$/),
  deliveryChannels: z.object({
    email: z.boolean(),
    telegram: z.boolean(),
    push: z.boolean(),
  }),
  active: z.boolean(),
  extraEmails: z.array(z.string().email()).max(3).default([]),
  includeHistory: z.boolean().optional().default(false),
})

export const PublishToMarketplaceSchema = z.object({
  clippingId: z.string().min(1),
  description: z
    .string()
    .min(1, 'Descrição é obrigatória para publicar')
    .max(500),
  recortes: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1, 'Título é obrigatório para publicar').max(100),
        themes: z.array(z.string()),
        agencies: z.array(z.string()),
        keywords: z.array(z.string().max(100)),
      }),
    )
    .min(1),
})

export const FollowListingSchema = z.object({
  scheduleTime: z.string().regex(/^([01]\d|2[0-3]):[03]0$/),
  deliveryChannels: z.object({
    email: z.boolean(),
    telegram: z.boolean(),
    push: z.boolean(),
  }),
})
