import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@/__tests__/test-utils'
import type { Recorte } from '@/types/clipping'
import { RecorteEditor } from '../RecorteEditor'

// Mock the filter selectors to keep tests simple
vi.mock('@/components/filters/ThemeMultiSelect', () => ({
  ThemeMultiSelect: ({
    selectedThemes,
    onSelectedThemesChange,
  }: {
    selectedThemes: string[]
    onSelectedThemesChange: (themes: string[]) => void
  }) => (
    <div data-testid="theme-multi-select">
      <button
        type="button"
        data-testid="theme-select-btn"
        onClick={() => onSelectedThemesChange(['01'])}
      >
        {selectedThemes.length > 0
          ? selectedThemes.join(',')
          : 'Selecione temas...'}
      </button>
    </div>
  ),
}))

vi.mock('@/components/filters/AgencyMultiSelect', () => ({
  AgencyMultiSelect: ({
    selectedAgencies,
    onSelectedAgenciesChange,
  }: {
    selectedAgencies: string[]
    onSelectedAgenciesChange: (agencies: string[]) => void
  }) => (
    <div data-testid="agency-multi-select">
      <button
        type="button"
        data-testid="agency-select-btn"
        onClick={() => onSelectedAgenciesChange(['mc'])}
      >
        {selectedAgencies.length > 0
          ? selectedAgencies.join(',')
          : 'Selecione órgãos...'}
      </button>
    </div>
  ),
}))

const baseRecorte: Recorte = {
  id: 'rec-1',
  themes: [],
  agencies: [],
  keywords: [],
}

describe('RecorteEditor', () => {
  it('renders theme, agency, and keyword sections', () => {
    render(
      <RecorteEditor
        recorte={baseRecorte}
        onChange={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(screen.getByTestId('theme-multi-select')).toBeInTheDocument()
    expect(screen.getByTestId('agency-multi-select')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/palavra-chave/i)).toBeInTheDocument()
  })

  it('adds keyword on Enter key press in keyword input', async () => {
    const handleChange = vi.fn()
    const { user } = render(
      <RecorteEditor
        recorte={baseRecorte}
        onChange={handleChange}
        onRemove={() => {}}
      />,
    )
    const input = screen.getByPlaceholderText(/palavra-chave/i)
    await user.click(input)
    await user.type(input, 'inteligência')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ keywords: ['inteligência'] }),
    )
  })

  it('removes keyword when clicking X on badge', async () => {
    const handleChange = vi.fn()
    const recorte: Recorte = { ...baseRecorte, keywords: ['orçamento'] }
    const { user } = render(
      <RecorteEditor
        recorte={recorte}
        onChange={handleChange}
        onRemove={() => {}}
      />,
    )
    const removeBtn = screen.getByRole('button', { name: /remover orçamento/i })
    await user.click(removeBtn)
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ keywords: [] }),
    )
  })

  it('calls onChange with updated themes when themes are selected', async () => {
    const handleChange = vi.fn()
    const { user } = render(
      <RecorteEditor
        recorte={baseRecorte}
        onChange={handleChange}
        onRemove={() => {}}
      />,
    )
    await user.click(screen.getByTestId('theme-select-btn'))
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ themes: ['01'] }),
    )
  })

  it('calls onChange with updated agencies when agencies are selected', async () => {
    const handleChange = vi.fn()
    const { user } = render(
      <RecorteEditor
        recorte={baseRecorte}
        onChange={handleChange}
        onRemove={() => {}}
      />,
    )
    await user.click(screen.getByTestId('agency-select-btn'))
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ agencies: ['mc'] }),
    )
  })

  it('does not show "Remover Recorte" button when it is the only recorte (onRemove not exposed as removable)', () => {
    // When we don't pass showRemove, the button should not appear
    render(
      <RecorteEditor
        recorte={baseRecorte}
        onChange={() => {}}
        onRemove={() => {}}
        showRemove={false}
      />,
    )
    expect(
      screen.queryByRole('button', { name: /remover recorte/i }),
    ).not.toBeInTheDocument()
  })

  it('shows "Remover Recorte" button when showRemove is true', () => {
    const handleRemove = vi.fn()
    render(
      <RecorteEditor
        recorte={baseRecorte}
        onChange={() => {}}
        onRemove={handleRemove}
        showRemove={true}
      />,
    )
    expect(
      screen.getByRole('button', { name: /remover recorte/i }),
    ).toBeInTheDocument()
  })
})
