import { describe, expect, it } from 'vitest'
import { normalizeEmail } from '../normalize-email'

describe('normalizeEmail', () => {
  it('lowercases email', () => {
    expect(normalizeEmail('User@Example.COM')).toBe('user@example.com')
  })

  it('trims whitespace', () => {
    expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com')
  })

  it('handles already lowercase email', () => {
    expect(normalizeEmail('user@example.com')).toBe('user@example.com')
  })

  it('normalizes mixed case from different providers', () => {
    // Google might return "Nitai@Gmail.com", Keycloak "nitai@gmail.com"
    expect(normalizeEmail('Nitai@Gmail.com')).toBe('nitai@gmail.com')
    expect(normalizeEmail('nitai@gmail.com')).toBe('nitai@gmail.com')
  })
})
