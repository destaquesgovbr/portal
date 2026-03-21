import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@/__tests__/test-utils'
import { CronScheduleBuilder } from '../CronScheduleBuilder'

vi.mock('@/lib/cron-utils', () => ({
  cronToHumanReadable: (schedule: string) => `preview: ${schedule}`,
}))

const defaultValue = {
  schedule: '0 8 * * *',
  startDate: null,
  endDate: null,
}

describe('CronScheduleBuilder', () => {
  it('renders with default "Diário" frequency and 08:00 time', () => {
    render(<CronScheduleBuilder value={defaultValue} onChange={() => {}} />)
    const diarioRadio = screen.getByLabelText('Diário')
    expect(diarioRadio).toBeChecked()
    const timeInput = screen.getByDisplayValue('08:00')
    expect(timeInput).toBeInTheDocument()
  })

  it('selecting "Dias úteis" generates cron 0 8 * * 1-5', async () => {
    const handleChange = vi.fn()
    const { user } = render(
      <CronScheduleBuilder value={defaultValue} onChange={handleChange} />,
    )
    await user.click(screen.getByLabelText('Dias úteis (Seg-Sex)'))
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ schedule: '0 8 * * 1-5' }),
    )
  })

  it('selecting "Diário" generates cron 0 8 * * *', async () => {
    const handleChange = vi.fn()
    const weekdayValue = {
      schedule: '0 8 * * 1-5',
      startDate: null,
      endDate: null,
    }
    const { user } = render(
      <CronScheduleBuilder value={weekdayValue} onChange={handleChange} />,
    )
    await user.click(screen.getByLabelText('Diário'))
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ schedule: '0 8 * * *' }),
    )
  })

  it('selecting specific days (Mon, Wed, Fri) generates 0 8 * * 1,3,5', async () => {
    const handleChange = vi.fn()
    const { user } = render(
      <CronScheduleBuilder value={defaultValue} onChange={handleChange} />,
    )
    // Switch to Personalizado — this shows day checkboxes
    await user.click(screen.getByLabelText('Personalizado'))
    // Now day checkboxes are visible — click Seg, Qua, Sex
    await user.click(screen.getByLabelText('Seg'))
    await user.click(screen.getByLabelText('Qua'))
    await user.click(screen.getByLabelText('Sex'))
    const lastCall =
      handleChange.mock.calls[handleChange.mock.calls.length - 1][0]
    expect(lastCall.schedule).toBe('0 8 * * 1,3,5')
  })

  it('adding a second time (18:00) generates 0 8,18 * * 1-5', async () => {
    const handleChange = vi.fn()
    const weekdayValue = {
      schedule: '0 8 * * 1-5',
      startDate: null,
      endDate: null,
    }
    const { user } = render(
      <CronScheduleBuilder value={weekdayValue} onChange={handleChange} />,
    )
    // Click "Adicionar horário"
    await user.click(screen.getByRole('button', { name: /adicionar horário/i }))
    // After adding, a second time input appears with default 18:00
    const allTimeInputs = document.querySelectorAll('input[type="time"]')
    expect(allTimeInputs.length).toBe(2)
    // The add triggers onChange with the new time
    const lastCall =
      handleChange.mock.calls[handleChange.mock.calls.length - 1][0]
    expect(lastCall.schedule).toBe('0 8,18 * * 1-5')
  })

  it('changing time to 14:30 generates 30 14 * * *', () => {
    const handleChange = vi.fn()
    render(<CronScheduleBuilder value={defaultValue} onChange={handleChange} />)
    const timeInput = screen.getByDisplayValue('08:00')
    fireEvent.change(timeInput, { target: { value: '14:30' } })
    const lastCall =
      handleChange.mock.calls[handleChange.mock.calls.length - 1][0]
    expect(lastCall.schedule).toBe('30 14 * * *')
  })

  it('shows human-readable preview text', () => {
    render(<CronScheduleBuilder value={defaultValue} onChange={() => {}} />)
    expect(screen.getByText('preview: 0 8 * * *')).toBeInTheDocument()
  })

  it('setting start date updates the value', () => {
    const handleChange = vi.fn()
    render(<CronScheduleBuilder value={defaultValue} onChange={handleChange} />)
    const startDateInput = screen.getByLabelText('Data de início')
    fireEvent.change(startDateInput, { target: { value: '2026-04-01' } })
    const lastCall =
      handleChange.mock.calls[handleChange.mock.calls.length - 1][0]
    expect(lastCall.startDate).toBe('2026-04-01')
  })

  it('setting end date updates the value', () => {
    const handleChange = vi.fn()
    render(<CronScheduleBuilder value={defaultValue} onChange={handleChange} />)
    const endDateInput = screen.getByLabelText('Data de fim')
    fireEvent.change(endDateInput, { target: { value: '2026-12-31' } })
    const lastCall =
      handleChange.mock.calls[handleChange.mock.calls.length - 1][0]
    expect(lastCall.endDate).toBe('2026-12-31')
  })

  it('calls onChange with { schedule, startDate, endDate }', async () => {
    const handleChange = vi.fn()
    const { user } = render(
      <CronScheduleBuilder value={defaultValue} onChange={handleChange} />,
    )
    await user.click(screen.getByLabelText('Dias úteis (Seg-Sex)'))
    expect(handleChange).toHaveBeenCalledWith({
      schedule: '0 8 * * 1-5',
      startDate: null,
      endDate: null,
    })
  })
})
