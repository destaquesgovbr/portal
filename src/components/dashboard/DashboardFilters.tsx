'use client'

import { X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type DatePreset = 'week' | 'month' | 'semester' | 'year' | 'custom'

export function DashboardFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [preset, setPreset] = useState<DatePreset>('month')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)

  // Initialize from URL params
  useEffect(() => {
    const presetParam = searchParams.get('preset') as DatePreset
    const startParam = searchParams.get('start')
    const endParam = searchParams.get('end')

    if (
      presetParam &&
      ['week', 'month', 'semester', 'year', 'custom'].includes(presetParam)
    ) {
      setPreset(presetParam)
    }

    if (startParam) {
      setStartDate(new Date(startParam))
    }

    if (endParam) {
      setEndDate(new Date(endParam))
    }
  }, [searchParams])

  const handlePresetChange = (newPreset: DatePreset) => {
    setPreset(newPreset)

    const params = new URLSearchParams(searchParams.toString())
    params.set('preset', newPreset)

    // Clear custom dates if not custom preset
    if (newPreset !== 'custom') {
      params.delete('start')
      params.delete('end')
      setStartDate(undefined)
      setEndDate(undefined)
    }

    router.push(`?${params.toString()}`)
  }

  const handleDateChange = (type: 'start' | 'end', date: Date | undefined) => {
    if (type === 'start') {
      setStartDate(date)
    } else {
      setEndDate(date)
    }

    const params = new URLSearchParams(searchParams.toString())
    params.set('preset', 'custom')

    if (date) {
      params.set(type, date.toISOString().split('T')[0])
    } else {
      params.delete(type)
    }

    router.push(`?${params.toString()}`)
  }

  return (
    <aside className="w-full flex-shrink-0">
      <div className="sticky top-4">
        <h3 className="text-lg font-semibold text-primary mb-4">Filtros</h3>

        <div className="flex flex-wrap items-end gap-4">
          {/* Single dropdown for presets */}
          <div className="flex flex-col gap-2 w-full lg:w-auto">
            <label
              htmlFor="period-select"
              className="text-sm font-semibold text-primary"
            >
              Período
            </label>
            <select
              id="period-select"
              value={preset}
              onChange={(e) => handlePresetChange(e.target.value as DatePreset)}
              className="w-full h-10 px-3 py-2 border border-input rounded-md text-sm bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
            >
              <option value="week">Última semana</option>
              <option value="month">Último mês</option>
              <option value="semester">Último semestre</option>
              <option value="year">Último ano</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {/* Render date pickers only when 'custom' is selected */}
          {preset === 'custom' && (
            <>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="custom-start-date"
                  className="text-sm font-semibold text-primary"
                >
                  Início
                </label>
                <div className="relative">
                  <Input
                    id="custom-start-date"
                    type="date"
                    onChange={(e) =>
                      handleDateChange(
                        'start',
                        e.target.value ? new Date(e.target.value) : undefined,
                      )
                    }
                    className={startDate ? 'pr-9' : undefined}
                    value={
                      startDate ? startDate.toISOString().split('T')[0] : ''
                    }
                  />
                  {startDate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDateChange('start', undefined)}
                      aria-label="Limpar data de início"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-muted-foreground hover:bg-gray-200"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="custom-end-date"
                  className="text-sm font-semibold text-primary"
                >
                  Fim
                </label>
                <div className="relative">
                  <Input
                    id="custom-end-date"
                    type="date"
                    onChange={(e) =>
                      handleDateChange(
                        'end',
                        e.target.value ? new Date(e.target.value) : undefined,
                      )
                    }
                    className={endDate ? 'pr-9' : undefined}
                    value={endDate ? endDate.toISOString().split('T')[0] : ''}
                  />
                  {endDate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDateChange('end', undefined)}
                      aria-label="Limpar data de fim"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-muted-foreground hover:bg-gray-200"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
