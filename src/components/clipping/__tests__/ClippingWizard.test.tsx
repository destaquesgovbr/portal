import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
        onClick={() => onChange({ ...recorte, themes: ['01'] })}
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

vi.mock('../ScheduleSelect', () => ({
  ScheduleSelect: ({
    value,
    onChange,
  }: {
    value: string
    onChange: (v: string) => void
  }) => (
    <select
      data-testid="schedule-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="08:00">08:00</option>
      <option value="09:00">09:00</option>
    </select>
  ),
}))

vi.mock('../ChannelSelector', () => ({
  ChannelSelector: ({
    value,
    onChange,
  }: {
    value: { email: boolean; telegram: boolean; push: boolean }
    onChange: (v: typeof value) => void
    hasTelegram: boolean
  }) => (
    <div data-testid="channel-selector">
      <input
        type="checkbox"
        data-testid="channel-email"
        checked={value.email}
        onChange={() => onChange({ ...value, email: !value.email })}
        aria-label="email"
      />
    </div>
  ),
}))

const defaultOnSubmit = vi.fn().mockResolvedValue(undefined)

async function fillRecorteAndName(user: ReturnType<typeof render>['user']) {
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
})
