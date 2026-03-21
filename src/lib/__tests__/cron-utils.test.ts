import { describe, expect, it } from 'vitest'
import {
  calculateNextRun,
  cronToHumanReadable,
  isValidCron,
} from '../cron-utils'

describe('isValidCron', () => {
  it('accepts standard 5-field cron', () => {
    expect(isValidCron('0 8 * * *')).toBe(true)
    expect(isValidCron('0 8 * * 1-5')).toBe(true)
    expect(isValidCron('*/10 * * * *')).toBe(true)
    expect(isValidCron('0 8,18 * * 1-5')).toBe(true)
    expect(isValidCron('30 9 * * 1,3,5')).toBe(true)
  })

  it('rejects invalid cron', () => {
    expect(isValidCron('')).toBe(false)
    expect(isValidCron('not a cron')).toBe(false)
    expect(isValidCron('08:00')).toBe(false)
    expect(isValidCron('60 25 * * *')).toBe(false)
  })
})

describe('calculateNextRun', () => {
  it('returns next occurrence for daily cron', () => {
    const now = new Date('2026-03-21T10:00:00-03:00')
    const next = calculateNextRun('0 14 * * *', now)
    expect(next).not.toBeNull()
    expect(next!.getHours()).toBe(14)
    expect(next!.getMinutes()).toBe(0)
  })

  it('returns next day when time already passed', () => {
    const now = new Date('2026-03-21T15:00:00-03:00')
    const next = calculateNextRun('0 8 * * *', now)
    expect(next).not.toBeNull()
    expect(next!.getDate()).toBe(22)
  })

  it('skips weekends for weekday cron', () => {
    // 2026-03-21 is Saturday
    const now = new Date('2026-03-21T07:00:00-03:00')
    const next = calculateNextRun('0 8 * * 1-5', now)
    expect(next).not.toBeNull()
    // Should be Monday Mar 23
    expect(next!.getDay()).toBeGreaterThanOrEqual(1)
    expect(next!.getDay()).toBeLessThanOrEqual(5)
  })

  it('respects startDate in the future', () => {
    const now = new Date('2026-03-21T10:00:00-03:00')
    const startDate = new Date('2026-04-01T00:00:00-03:00')
    const next = calculateNextRun('0 8 * * *', now, startDate)
    expect(next).not.toBeNull()
    expect(next!.getTime()).toBeGreaterThanOrEqual(startDate.getTime())
  })

  it('returns null when endDate is past', () => {
    const now = new Date('2026-03-21T10:00:00-03:00')
    const endDate = new Date('2026-03-20T00:00:00-03:00')
    const next = calculateNextRun('0 8 * * *', now, undefined, endDate)
    expect(next).toBeNull()
  })

  it('returns null when next run exceeds endDate', () => {
    const now = new Date('2026-03-21T10:00:00-03:00')
    const endDate = new Date('2026-03-21T12:00:00-03:00')
    const next = calculateNextRun('0 14 * * *', now, undefined, endDate)
    expect(next).toBeNull()
  })

  it('handles multiple hours', () => {
    const now = new Date('2026-03-21T09:00:00-03:00')
    const next = calculateNextRun('0 8,14,20 * * *', now)
    expect(next).not.toBeNull()
    expect(next!.getHours()).toBe(14)
  })
})

describe('cronToHumanReadable', () => {
  it('describes daily cron', () => {
    const text = cronToHumanReadable('0 8 * * *')
    expect(text).toMatch(/todos os dias/i)
    expect(text).toMatch(/08:00/)
  })

  it('describes weekday cron', () => {
    const text = cronToHumanReadable('0 8 * * 1-5')
    expect(text).toMatch(/seg.*sex/i)
    expect(text).toMatch(/08:00/)
  })

  it('describes multiple hours', () => {
    const text = cronToHumanReadable('0 8,18 * * 1-5')
    expect(text).toMatch(/08:00/)
    expect(text).toMatch(/18:00/)
  })

  it('describes specific days', () => {
    const text = cronToHumanReadable('0 8 * * 1,3,5')
    expect(text).toMatch(/seg/i)
    expect(text).toMatch(/qua/i)
    expect(text).toMatch(/sex/i)
  })
})
