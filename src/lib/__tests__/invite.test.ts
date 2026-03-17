import { describe, expect, it } from 'vitest'
import { generateInviteCode } from '../invite'

describe('invite', () => {
  describe('generateInviteCode', () => {
    it('generates a string of length 8', () => {
      const code = generateInviteCode()
      expect(code).toHaveLength(8)
    })

    it('generates URL-safe characters only', () => {
      const code = generateInviteCode()
      // nanoid default alphabet: A-Za-z0-9_-
      expect(code).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('generates unique codes', () => {
      const codes = new Set(
        Array.from({ length: 100 }, () => generateInviteCode()),
      )
      expect(codes.size).toBe(100)
    })
  })
})
