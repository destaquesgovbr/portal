'use client'

import { Minus, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cronToHumanReadable } from '@/lib/cron-utils'

export type CronScheduleValue = {
  schedule: string
  startDate: string | null
  endDate: string | null
}

type Props = {
  value: CronScheduleValue
  onChange: (value: CronScheduleValue) => void
}

type Frequency = 'daily' | 'weekdays' | 'custom'

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const
const MAX_TIMES = 4

function buildCron(
  minutes: number[],
  hours: number[],
  days: number[],
  frequency: Frequency,
): string {
  const minField = [...new Set(minutes)].sort((a, b) => a - b).join(',')
  const hourField = [...new Set(hours)].sort((a, b) => a - b).join(',')

  let dowField: string
  if (frequency === 'daily') {
    dowField = '*'
  } else if (frequency === 'weekdays') {
    dowField = '1-5'
  } else {
    dowField =
      days.length === 0 || days.length === 7
        ? '*'
        : [...days].sort((a, b) => a - b).join(',')
  }

  return `${minField} ${hourField} * * ${dowField}`
}

function parseCron(schedule: string): {
  frequency: Frequency
  days: number[]
  times: string[]
} {
  const parts = schedule.trim().split(/\s+/)
  if (parts.length !== 5) {
    return { frequency: 'daily', days: [], times: ['08:00'] }
  }

  const [minuteField, hourField, , , dowField] = parts

  const hours = hourField.split(',').map(Number)
  const minutes = minuteField.split(',')
  const minute = minutes[0] ?? '0'
  const times = hours.map(
    (h) =>
      `${String(h).padStart(2, '0')}:${String(Number(minute)).padStart(2, '0')}`,
  )

  let frequency: Frequency = 'daily'
  let days: number[] = []

  if (dowField === '*') {
    frequency = 'daily'
  } else if (dowField === '1-5') {
    frequency = 'weekdays'
  } else {
    frequency = 'custom'
    days = dowField.split(',').map(Number)
  }

  return { frequency, days, times }
}

export function CronScheduleBuilder({ value, onChange }: Props) {
  const parsed = parseCron(value.schedule)
  const [frequency, setFrequency] = useState<Frequency>(parsed.frequency)
  const [days, setDays] = useState<number[]>(parsed.days)
  const [times, setTimes] = useState<string[]>(parsed.times)
  const [startDate, setStartDate] = useState<string>(value.startDate ?? '')
  const [endDate, setEndDate] = useState<string>(value.endDate ?? '')

  // Sync from props when value changes externally
  const prevSchedule = useRef(value.schedule)
  useEffect(() => {
    if (value.schedule !== prevSchedule.current) {
      const p = parseCron(value.schedule)
      setFrequency(p.frequency)
      setDays(p.days)
      setTimes(p.times)
      prevSchedule.current = value.schedule
    }
  }, [value.schedule])

  useEffect(() => {
    setStartDate(value.startDate ?? '')
  }, [value.startDate])

  useEffect(() => {
    setEndDate(value.endDate ?? '')
  }, [value.endDate])

  const emitChange = useCallback(
    (schedule: string, sd: string, ed: string) => {
      prevSchedule.current = schedule
      onChange({
        schedule,
        startDate: sd || null,
        endDate: ed || null,
      })
    },
    [onChange],
  )

  const buildAndEmit = useCallback(
    (newTimes: string[], newFreq: Frequency, newDays: number[]) => {
      const parsedTimes = newTimes.map((t) => {
        const [h, m] = t.split(':').map(Number)
        return { hour: h, minute: m }
      })
      const hours = parsedTimes.map((t) => t.hour)
      const mins = parsedTimes.map((t) => t.minute)
      const schedule = buildCron(mins, hours, newDays, newFreq)
      emitChange(schedule, startDate, endDate)
    },
    [emitChange, startDate, endDate],
  )

  const handleFrequencyChange = useCallback(
    (newFreq: Frequency) => {
      setFrequency(newFreq)
      if (newFreq === 'custom') {
        setDays([])
      }
      buildAndEmit(times, newFreq, newFreq === 'custom' ? [] : days)
    },
    [times, days, buildAndEmit],
  )

  const handleDayToggle = useCallback(
    (dayIndex: number) => {
      const newDays = days.includes(dayIndex)
        ? days.filter((d) => d !== dayIndex)
        : [...days, dayIndex]
      setDays(newDays)
      buildAndEmit(times, 'custom', newDays)
    },
    [days, times, buildAndEmit],
  )

  const handleTimeChange = useCallback(
    (index: number, newTime: string) => {
      const newTimes = [...times]
      newTimes[index] = newTime
      setTimes(newTimes)
      buildAndEmit(newTimes, frequency, days)
    },
    [times, frequency, days, buildAndEmit],
  )

  const handleAddTime = useCallback(() => {
    if (times.length >= MAX_TIMES) return
    const newTimes = [...times, '18:00']
    setTimes(newTimes)
    buildAndEmit(newTimes, frequency, days)
  }, [times, frequency, days, buildAndEmit])

  const handleRemoveTime = useCallback(
    (index: number) => {
      if (times.length <= 1) return
      const newTimes = times.filter((_, i) => i !== index)
      setTimes(newTimes)
      buildAndEmit(newTimes, frequency, days)
    },
    [times, frequency, days, buildAndEmit],
  )

  const handleStartDateChange = useCallback(
    (date: string) => {
      setStartDate(date)
      emitChange(
        buildCron(
          times.map((t) => Number(t.split(':')[1])),
          times.map((t) => Number(t.split(':')[0])),
          days,
          frequency,
        ),
        date,
        endDate,
      )
    },
    [times, frequency, days, endDate, emitChange],
  )

  const handleEndDateChange = useCallback(
    (date: string) => {
      setEndDate(date)
      emitChange(
        buildCron(
          times.map((t) => Number(t.split(':')[1])),
          times.map((t) => Number(t.split(':')[0])),
          days,
          frequency,
        ),
        startDate,
        date,
      )
    },
    [times, frequency, days, startDate, emitChange],
  )

  const schedule = buildCron(
    times.map((t) => Number(t.split(':')[1])),
    times.map((t) => Number(t.split(':')[0])),
    days,
    frequency,
  )
  const preview = cronToHumanReadable(schedule)

  return (
    <div className="space-y-5">
      {/* Frequency selector */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Frequência</legend>
        <div className="flex flex-wrap gap-4">
          {(
            [
              ['daily', 'Diário'],
              ['weekdays', 'Dias úteis (Seg-Sex)'],
              ['custom', 'Personalizado'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="cron-frequency"
                value={key}
                checked={frequency === key}
                onChange={() => handleFrequencyChange(key)}
                className="h-4 w-4 text-primary focus:ring-primary"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Day checkboxes (only for custom) */}
      {frequency === 'custom' && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Dias da semana</legend>
          <div className="flex flex-wrap gap-3">
            {DAY_LABELS.map((label, index) => (
              <label
                key={label}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={days.includes(index)}
                  onChange={() => handleDayToggle(index)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  aria-label={label}
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Time picker(s) */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Horário(s)</span>
        <div className="space-y-2">
          {times.map((time, index) => (
            <div key={time} className="flex items-center gap-2">
              <Label htmlFor={`cron-time-${index}`} className="sr-only">
                Horário {index + 1}
              </Label>
              <input
                id={`cron-time-${index}`}
                type="time"
                step="600"
                value={time}
                onChange={(e) => handleTimeChange(index, e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {times.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveTime(index)}
                  aria-label={`Remover horário ${index + 1}`}
                  className="h-8 w-8 cursor-pointer"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        {times.length < MAX_TIMES && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddTime}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar horário
          </Button>
        )}
      </div>

      {/* Period section */}
      <div className="space-y-3">
        <span className="text-sm font-medium">Período</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cron-start-date">Data de início</Label>
            <input
              id="cron-start-date"
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cron-end-date">Data de fim</Label>
            <input
              id="cron-end-date"
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        <span>{preview}</span>
        {(startDate || endDate) && (
          <span className="ml-1">
            {startDate && endDate
              ? `— De ${startDate} a ${endDate}`
              : startDate
                ? `— A partir de ${startDate}`
                : `— Até ${endDate}`}
          </span>
        )}
      </div>
    </div>
  )
}
