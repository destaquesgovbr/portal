import { describe, expect, it } from 'vitest'
import { ClippingPayloadSchema } from '../clipping-validation'

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Clipping',
    recortes: [
      { id: '1', title: 'R1', themes: ['01'], agencies: [], keywords: [] },
    ],
    prompt: '',
    schedule: '0 8 * * *',
    deliveryChannels: { email: true, telegram: false, push: false },
    active: true,
    ...overrides,
  }
}

describe('ClippingPayloadSchema – webhookUrl', () => {
  it('accepts an empty string', () => {
    const result = ClippingPayloadSchema.safeParse(
      validPayload({ webhookUrl: '' }),
    )
    expect(result.success).toBe(true)
  })

  it('accepts a valid URL', () => {
    const result = ClippingPayloadSchema.safeParse(
      validPayload({ webhookUrl: 'https://example.com/hook' }),
    )
    expect(result.success).toBe(true)
  })

  it('rejects an invalid URL', () => {
    const result = ClippingPayloadSchema.safeParse(
      validPayload({ webhookUrl: 'not-a-url' }),
    )
    expect(result.success).toBe(false)
  })

  it('defaults webhookUrl to empty string when omitted', () => {
    const result = ClippingPayloadSchema.safeParse(validPayload())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.webhookUrl).toBe('')
    }
  })
})

describe('ClippingPayloadSchema – deliveryChannels.webhook', () => {
  it('defaults webhook to false when omitted', () => {
    const result = ClippingPayloadSchema.safeParse(validPayload())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.deliveryChannels.webhook).toBe(false)
    }
  })

  it('accepts webhook: true', () => {
    const result = ClippingPayloadSchema.safeParse(
      validPayload({
        deliveryChannels: {
          email: true,
          telegram: false,
          push: false,
          webhook: true,
        },
      }),
    )
    expect(result.success).toBe(true)
  })
})
