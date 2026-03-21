import { CronExpressionParser } from 'cron-parser'

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/**
 * Validate a 5-field cron expression.
 */
export function isValidCron(expression: string): boolean {
  try {
    if (!expression || expression.trim().split(/\s+/).length !== 5) return false
    CronExpressionParser.parse(expression)
    return true
  } catch {
    return false
  }
}

/**
 * Calculate the next run time for a cron expression.
 * Returns null if endDate is past or next run exceeds endDate.
 */
export function calculateNextRun(
  schedule: string,
  now: Date = new Date(),
  startDate?: Date,
  endDate?: Date,
): Date | null {
  if (endDate && endDate < now) return null

  const base = startDate && startDate > now ? startDate : now
  try {
    const expr = CronExpressionParser.parse(schedule, {
      currentDate: base,
      tz: 'America/Sao_Paulo',
    })
    const next = expr.next().toDate()
    if (endDate && next > endDate) return null
    return next
  } catch {
    return null
  }
}

/**
 * Convert a cron expression to a human-readable string in Portuguese.
 */
export function cronToHumanReadable(schedule: string): string {
  try {
    const parts = schedule.trim().split(/\s+/)
    if (parts.length !== 5) return schedule

    const [minuteField, hourField, , , dowField] = parts

    const hours = hourField.split(',')
    const minute = minuteField === '*' ? '00' : minuteField.padStart(2, '0')
    const times = hours.map((h) => `${h.padStart(2, '0')}:${minute}`)
    const timeStr = times.join(' e ')

    if (dowField === '*') {
      return `Todos os dias às ${timeStr}`
    }

    if (dowField === '1-5') {
      return `Seg a Sex às ${timeStr}`
    }

    const dayNumbers = dowField.split(',').map(Number)
    const dayNames = dayNumbers.map((d) => DAY_NAMES[d] ?? String(d))
    return `${dayNames.join(', ')} às ${timeStr}`
  } catch {
    return schedule
  }
}
