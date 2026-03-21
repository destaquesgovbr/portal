import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@/__tests__/test-utils'
import type { DeliveryChannels } from '@/types/clipping'
import { ChannelSelector } from '../ChannelSelector'

const defaultChannels: DeliveryChannels = {
  email: false,
  telegram: false,
  push: false,
  webhook: false,
}

function renderSelector(
  overrides: Partial<Parameters<typeof ChannelSelector>[0]> = {},
) {
  const props = {
    value: defaultChannels,
    onChange: vi.fn(),
    hasTelegram: false,
    extraEmails: [],
    onExtraEmailsChange: vi.fn(),
    webhookUrl: '',
    onWebhookUrlChange: vi.fn(),
    ...overrides,
  }
  const result = render(<ChannelSelector {...props} />)
  return { ...result, props }
}

describe('ChannelSelector', () => {
  it('renders all channel options (email, telegram, push, webhook)', () => {
    renderSelector()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Telegram')).toBeInTheDocument()
    expect(screen.getByLabelText('Push')).toBeInTheDocument()
    expect(screen.getByLabelText('Webhook')).toBeInTheDocument()
  })

  it('webhook checkbox toggles correctly', async () => {
    const onChange = vi.fn()
    const { user } = renderSelector({ onChange })

    await user.click(screen.getByLabelText('Webhook'))
    expect(onChange).toHaveBeenCalledWith({
      ...defaultChannels,
      webhook: true,
    })
  })

  it('webhook URL input appears only when webhook is checked', () => {
    renderSelector()
    expect(screen.queryByLabelText('Webhook URL')).not.toBeInTheDocument()

    renderSelector({
      value: { ...defaultChannels, webhook: true },
    })
    expect(screen.getByLabelText('Webhook URL')).toBeInTheDocument()
  })

  it('webhook URL input calls onWebhookUrlChange', async () => {
    const onWebhookUrlChange = vi.fn()
    const { user } = renderSelector({
      value: { ...defaultChannels, webhook: true },
      onWebhookUrlChange,
    })

    const input = screen.getByLabelText('Webhook URL')
    await user.type(input, 'https://example.com/hook')
    expect(onWebhookUrlChange).toHaveBeenCalled()
  })

  it('ExtraEmails appears when email is checked', () => {
    renderSelector({
      value: { ...defaultChannels, email: true },
    })
    // ExtraEmailsInput renders when email is checked
    expect(screen.getByText(/emails extras/i)).toBeInTheDocument()
  })

  it('webhook URL input shows error for invalid URLs', async () => {
    const { user } = renderSelector({
      value: { ...defaultChannels, webhook: true },
      webhookUrl: 'not-a-url',
    })

    const input = screen.getByLabelText('Webhook URL')
    // Trigger blur to show validation
    await user.click(input)
    await user.tab()

    expect(screen.getByText('URL inválida')).toBeInTheDocument()
  })
})
