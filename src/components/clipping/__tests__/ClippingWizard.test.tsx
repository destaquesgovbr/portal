import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@/__tests__/test-utils'
import type { ClippingPayload } from '@/types/clipping'

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: { user: { id: 'test-user' } } })),
}))

import { ClippingWizard } from '../ClippingWizard'

// Mock child components
vi.mock('../RecorteEditor', () => ({
  RecorteEditor: ({
    recorte,
    onChange,
    onRemove,
    showRemove,
  }: {
    recorte: {
      id: string
      title: string
      themes: string[]
      agencies: string[]
      keywords: string[]
    }
    onChange: (r: typeof recorte) => void
    onRemove: () => void
    showRemove: boolean
  }) => (
    <div data-testid={`recorte-editor-${recorte.id}`}>
      <button
        type="button"
        data-testid={`add-theme-${recorte.id}`}
        onClick={() =>
          onChange({
            ...recorte,
            title: recorte.title || 'Recorte de teste',
            themes: ['01'],
          })
        }
      >
        Adicionar tema
      </button>
      {showRemove && (
        <button type="button" onClick={onRemove}>
          Remover Recorte
        </button>
      )}
    </div>
  ),
}))

vi.mock('../AgentRecorteGenerator', () => ({
  AgentRecorteGenerator: () => (
    <div data-testid="agent-generator">Agent mode mock</div>
  ),
}))

vi.mock('../PromptEditor', () => ({
  PromptEditor: ({
    value,
    onChange,
  }: {
    value: string
    onChange: (v: string) => void
    defaultPrompt: string
  }) => (
    <textarea
      data-testid="prompt-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

vi.mock('../CronScheduleBuilder', () => ({
  CronScheduleBuilder: ({
    value,
    onChange,
  }: {
    value: {
      schedule: string
      startDate: string | null
      endDate: string | null
    }
    onChange: (v: typeof value) => void
  }) => (
    <div data-testid="schedule-select">
      <span>{value.schedule}</span>
      <button
        type="button"
        data-testid="change-schedule"
        onClick={() => onChange({ ...value, schedule: '0 9 * * 1-5' })}
      >
        change
      </button>
    </div>
  ),
}))

vi.mock('../ChannelSelector', () => ({
  ChannelSelector: ({
    value,
    onChange,
    webhookUrl,
    onWebhookUrlChange,
  }: {
    value: {
      email: boolean
      telegram: boolean
      push: boolean
      webhook: boolean
    }
    onChange: (v: typeof value) => void
    hasTelegram: boolean
    webhookUrl: string
    onWebhookUrlChange: (url: string) => void
  }) => (
    <div data-testid="channel-selector">
      <input
        type="checkbox"
        data-testid="channel-email"
        checked={value.email}
        onChange={() => onChange({ ...value, email: !value.email })}
        aria-label="email"
      />
      <input
        type="checkbox"
        data-testid="channel-webhook"
        checked={value.webhook}
        onChange={() => onChange({ ...value, webhook: !value.webhook })}
        aria-label="webhook"
      />
      <input
        type="text"
        data-testid="webhook-url"
        value={webhookUrl}
        onChange={(e) => onWebhookUrlChange(e.target.value)}
        aria-label="webhook url"
      />
    </div>
  ),
}))

const defaultOnSubmit = vi.fn().mockResolvedValue(undefined)

async function switchToManualMode(user: ReturnType<typeof render>['user']) {
  const manualBtn = screen.queryByText(/manual/i)
  if (manualBtn) {
    await user.click(manualBtn)
  }
}

async function fillRecorteAndName(user: ReturnType<typeof render>['user']) {
  await switchToManualMode(user)
  const recorteEditors = screen.getAllByTestId(/^recorte-editor-/)
  const firstId = recorteEditors[0]
    .getAttribute('data-testid')!
    .replace('recorte-editor-', '')
  await user.click(screen.getByTestId(`add-theme-${firstId}`))
  const nameInput = screen.getByPlaceholderText(/nome do clipping/i)
  await user.clear(nameInput)
  await user.type(nameInput, 'Meu Clipping')
}

describe('ClippingWizard (3-step flow, prompt step hidden)', () => {
  it('renders step 1 with 1/3 indicator', () => {
    render(
      <ClippingWizard onSubmit={defaultOnSubmit} themes={[]} agencies={[]} />,
    )
    expect(screen.getByText(/1\/3/i)).toBeInTheDocument()
    expect(screen.getAllByText(/recortes/i).length).toBeGreaterThan(0)
  })

  it('cannot advance from step 1 without at least one recorte with filters', async () => {
    const { user } = render(
      <ClippingWizard onSubmit={defaultOnSubmit} themes={[]} agencies={[]} />,
    )
    const nextBtn = screen.getByRole('button', { name: /próximo/i })
    await user.click(nextBtn)
    expect(screen.getByText(/1\/3/i)).toBeInTheDocument()
  })

  it('advances through all 3 steps with valid data', async () => {
    const { user } = render(
      <ClippingWizard onSubmit={defaultOnSubmit} themes={[]} agencies={[]} />,
    )

    await fillRecorteAndName(user)

    // Advance to step 2 (Horário)
    await user.click(screen.getByRole('button', { name: /próximo/i }))
    expect(screen.getByText(/2\/3/i)).toBeInTheDocument()
    expect(screen.getByTestId('schedule-select')).toBeInTheDocument()

    // Advance to step 3 (Canais)
    await user.click(screen.getByRole('button', { name: /próximo/i }))
    expect(screen.getByText(/3\/3/i)).toBeInTheDocument()
    expect(screen.getByTestId('channel-selector')).toBeInTheDocument()
  })

  it('calls onSubmit with empty prompt when prompt step is hidden', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined)
    const { user } = render(
      <ClippingWizard onSubmit={handleSubmit} themes={[]} agencies={[]} />,
    )

    await fillRecorteAndName(user)

    // Navigate to Canais (2 clicks: Recortes → Horário → Canais)
    await user.click(screen.getByRole('button', { name: /próximo/i }))
    await user.click(screen.getByRole('button', { name: /próximo/i }))

    // Enable email channel
    await user.click(screen.getByTestId('channel-email'))

    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Meu Clipping',
          prompt: '',
          includeHistory: false,
        } as Partial<ClippingPayload>),
      )
    })
  })

  it('shows loading state during submit', async () => {
    let resolveSubmit!: () => void
    const handleSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve
        }),
    )
    const { user } = render(
      <ClippingWizard onSubmit={handleSubmit} themes={[]} agencies={[]} />,
    )

    await fillRecorteAndName(user)

    await user.click(screen.getByRole('button', { name: /próximo/i }))
    await user.click(screen.getByRole('button', { name: /próximo/i }))

    await user.click(screen.getByTestId('channel-email'))
    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirmar/i })).toBeDisabled()
    })

    resolveSubmit()
  })

  it('includes webhookUrl in submit payload', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined)
    const { user } = render(
      <ClippingWizard onSubmit={handleSubmit} themes={[]} agencies={[]} />,
    )

    await fillRecorteAndName(user)

    // Navigate to Canais (2 clicks: Recortes -> Horário -> Canais)
    await user.click(screen.getByRole('button', { name: /próximo/i }))
    await user.click(screen.getByRole('button', { name: /próximo/i }))

    // Enable webhook channel
    await user.click(screen.getByTestId('channel-webhook'))

    // Set webhook URL
    const urlInput = screen.getByTestId('webhook-url')
    await user.clear(urlInput)
    await user.type(urlInput, 'https://example.com/hook')

    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          webhookUrl: 'https://example.com/hook',
          deliveryChannels: expect.objectContaining({
            webhook: true,
          }),
        }),
      )
    })
  })
})
