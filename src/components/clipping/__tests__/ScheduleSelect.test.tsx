import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@/__tests__/test-utils'
import { ScheduleSelect } from '../ScheduleSelect'

// Mock @radix-ui/react-select to make it testable in jsdom
vi.mock('@/components/ui/select', () => {
  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string
      onValueChange: (v: string) => void
      children: React.ReactNode
    }) => (
      <div data-testid="select-root" data-value={value}>
        {children}
        <button
          type="button"
          data-testid="select-native"
          onClick={() => onValueChange('09:00')}
        >
          trigger-change
        </button>
      </div>
    ),
    SelectTrigger: ({
      children,
      ...props
    }: {
      children: React.ReactNode
    } & React.HTMLAttributes<HTMLDivElement>) => (
      <div data-testid="select-trigger" {...props}>
        {children}
      </div>
    ),
    SelectValue: ({ placeholder }: { placeholder?: string }) => (
      <span data-testid="select-value">{placeholder}</span>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="select-content">{children}</div>
    ),
    SelectItem: ({
      value,
      children,
    }: {
      value: string
      children: React.ReactNode
    }) => (
      <option data-testid={`select-item-${value}`} value={value}>
        {children}
      </option>
    ),
  }
})

describe('ScheduleSelect', () => {
  it('renders exactly 48 options (00:00 to 23:30 every 30 min)', () => {
    render(<ScheduleSelect value="08:00" onChange={() => {}} />)
    const items = screen.getAllByTestId(/^select-item-/)
    expect(items).toHaveLength(48)
    // Check first and last
    expect(screen.getByTestId('select-item-00:00')).toBeInTheDocument()
    expect(screen.getByTestId('select-item-23:30')).toBeInTheDocument()
  })

  it('renders with default value 08:00', () => {
    render(<ScheduleSelect value="08:00" onChange={() => {}} />)
    const root = screen.getByTestId('select-root')
    expect(root).toHaveAttribute('data-value', '08:00')
  })

  it('calls onChange with correct value when selection changes', async () => {
    const handleChange = vi.fn()
    const { user } = render(
      <ScheduleSelect value="08:00" onChange={handleChange} />,
    )
    // Click the trigger button which fires onValueChange('09:00')
    await user.click(screen.getByTestId('select-native'))
    expect(handleChange).toHaveBeenCalledWith('09:00')
  })

  it('highlights 08:00 with "(Sugerido)" label', () => {
    render(<ScheduleSelect value="08:00" onChange={() => {}} />)
    const item = screen.getByTestId('select-item-08:00')
    expect(item.textContent).toContain('Sugerido')
  })
})
