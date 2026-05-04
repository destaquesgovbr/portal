import { describe, expect, it } from 'vitest'
import {
  ClippingPayloadSchema,
  FollowListingSchema,
} from './clipping-validation'

describe('ClippingPayloadSchema - webhook URL validation', () => {
  const basePayload = {
    name: 'Test Clipping',
    description: 'Test description',
    recortes: [
      {
        id: '1',
        title: 'Recorte 1',
        themes: ['economia'],
        agencies: [],
        keywords: [],
      },
    ],
    prompt: 'Test prompt',
    schedule: '0 9 * * *',
    deliveryChannels: {
      email: false,
      telegram: false,
      push: false,
      webhook: true,
    },
    active: true,
    extraEmails: [],
  }

  describe('URLs permitidas', () => {
    it('aceita URL HTTPS válida', () => {
      const result = ClippingPayloadSchema.safeParse({
        ...basePayload,
        webhookUrl: 'https://example.com/webhook',
      })
      expect(result.success).toBe(true)
    })

    it('aceita URL HTTPS com subdomínio', () => {
      const result = ClippingPayloadSchema.safeParse({
        ...basePayload,
        webhookUrl: 'https://api.example.com/webhook',
      })
      expect(result.success).toBe(true)
    })

    it('aceita webhook URL vazia quando webhook está desativado', () => {
      const result = ClippingPayloadSchema.safeParse({
        ...basePayload,
        deliveryChannels: {
          email: true,
          telegram: false,
          push: false,
          webhook: false,
        },
        webhookUrl: '',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('URLs bloqueadas', () => {
    it('rejeita HTTP (não-HTTPS)', () => {
      const result = ClippingPayloadSchema.safeParse({
        ...basePayload,
        webhookUrl: 'http://example.com/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('rejeita localhost', () => {
      const result = ClippingPayloadSchema.safeParse({
        ...basePayload,
        webhookUrl: 'https://localhost:8080/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('rejeita 127.0.0.1', () => {
      const result = ClippingPayloadSchema.safeParse({
        ...basePayload,
        webhookUrl: 'https://127.0.0.1/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('rejeita metadata.google.internal', () => {
      const result = ClippingPayloadSchema.safeParse({
        ...basePayload,
        webhookUrl:
          'https://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity',
      })
      expect(result.success).toBe(false)
    })

    it('rejeita 169.254.169.254 (AWS/GCP metadata)', () => {
      const result = ClippingPayloadSchema.safeParse({
        ...basePayload,
        webhookUrl: 'https://169.254.169.254/latest/meta-data/',
      })
      expect(result.success).toBe(false)
    })

    it('rejeita IP privado 10.x.x.x', () => {
      const result = ClippingPayloadSchema.safeParse({
        ...basePayload,
        webhookUrl: 'https://10.0.0.1/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('rejeita IP privado 192.168.x.x', () => {
      const result = ClippingPayloadSchema.safeParse({
        ...basePayload,
        webhookUrl: 'https://192.168.1.1/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('rejeita IP privado 172.16.x.x', () => {
      const result = ClippingPayloadSchema.safeParse({
        ...basePayload,
        webhookUrl: 'https://172.16.0.1/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('rejeita IP privado 172.31.x.x', () => {
      const result = ClippingPayloadSchema.safeParse({
        ...basePayload,
        webhookUrl: 'https://172.31.255.255/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('rejeita IPv6 loopback [::1]', () => {
      const result = ClippingPayloadSchema.safeParse({
        ...basePayload,
        webhookUrl: 'https://[::1]/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('rejeita 0.0.0.0', () => {
      const result = ClippingPayloadSchema.safeParse({
        ...basePayload,
        webhookUrl: 'https://0.0.0.0/webhook',
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('FollowListingSchema - webhook URL validation', () => {
  const baseFollowPayload = {
    deliveryChannels: {
      email: false,
      telegram: false,
      push: false,
      webhook: true,
    },
    extraEmails: [],
  }

  it('aceita URL HTTPS válida', () => {
    const result = FollowListingSchema.safeParse({
      ...baseFollowPayload,
      webhookUrl: 'https://example.com/webhook',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita HTTP', () => {
    const result = FollowListingSchema.safeParse({
      ...baseFollowPayload,
      webhookUrl: 'http://example.com/webhook',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita localhost', () => {
    const result = FollowListingSchema.safeParse({
      ...baseFollowPayload,
      webhookUrl: 'https://localhost/webhook',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita metadata.google.internal', () => {
    const result = FollowListingSchema.safeParse({
      ...baseFollowPayload,
      webhookUrl: 'https://metadata.google.internal/path',
    })
    expect(result.success).toBe(false)
  })
})
