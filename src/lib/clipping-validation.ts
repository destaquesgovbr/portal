import { z } from 'zod'
import { isValidCron } from '@/lib/cron-utils'

function isSecureWebhookUrl(url: string): boolean {
  if (!url) return true // empty is valid (optional)

  try {
    const parsed = new URL(url)

    // Apenas HTTPS em produção
    if (parsed.protocol !== 'https:') return false

    // Bloquear hosts internos
    const blocked = [
      'localhost',
      '127.0.0.1',
      '169.254.169.254',
      'metadata.google.internal',
      'metadata',
      '[::1]',
      '0.0.0.0',
    ]
    const hostname = parsed.hostname.toLowerCase()
    if (blocked.some((h) => hostname === h || hostname.endsWith(`.${h}`))) {
      return false
    }

    // Bloquear IPs privados (10.x, 172.16-31.x, 192.168.x)
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(parsed.hostname)) {
      return false
    }

    return true
  } catch {
    return false
  }
}

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

export const ClippingPayloadSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    recortes: z.array(RecorteSchema).min(1),
    prompt: z.string().max(2000),
    schedule: z
      .string()
      .refine((v) => isValidCron(v), 'Expressão cron inválida'),
    startDate: z.string().date().nullable().optional(),
    endDate: z.string().date().nullable().optional(),
    deliveryChannels: z.object({
      email: z.boolean(),
      telegram: z.boolean(),
      push: z.boolean(),
      webhook: z.boolean().optional().default(false),
    }),
    active: z.boolean(),
    extraEmails: z.array(z.string().email()).max(3).default([]),
    webhookUrl: z
      .string()
      .url()
      .refine(isSecureWebhookUrl, {
        message:
          'URL de webhook deve ser HTTPS e apontar para host externo (IPs privados e hosts internos não são permitidos)',
      })
      .optional()
      .or(z.literal(''))
      .default(''),
    includeHistory: z.boolean().optional().default(false),
  })
  .refine(
    (data) =>
      !data.deliveryChannels.webhook ||
      (data.webhookUrl !== '' && data.webhookUrl !== undefined),
    {
      message: 'URL do webhook é obrigatória quando webhook está ativo',
      path: ['webhookUrl'],
    },
  )

export const PublishToMarketplaceSchema = z.object({
  clippingId: z.string().min(1),
  description: z
    .string()
    .min(1, 'Descrição é obrigatória para publicar')
    .max(500),
  backfillCount: z.number().int().min(0).max(10).optional().default(0),
})

export const FollowListingSchema = z
  .object({
    deliveryChannels: z.object({
      email: z.boolean(),
      telegram: z.boolean(),
      push: z.boolean(),
      webhook: z.boolean().optional().default(false),
    }),
    extraEmails: z.array(z.string().email()).optional().default([]),
    webhookUrl: z
      .string()
      .url()
      .refine(isSecureWebhookUrl, {
        message:
          'URL de webhook deve ser HTTPS e apontar para host externo (IPs privados e hosts internos não são permitidos)',
      })
      .optional()
      .or(z.literal(''))
      .default(''),
  })
  .refine(
    (data) =>
      !data.deliveryChannels.webhook ||
      (data.webhookUrl !== '' && data.webhookUrl !== undefined),
    {
      message: 'URL do webhook é obrigatória quando webhook está ativo',
      path: ['webhookUrl'],
    },
  )
