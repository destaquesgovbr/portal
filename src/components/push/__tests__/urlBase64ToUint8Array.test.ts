import { describe, expect, it } from 'vitest'
import { urlBase64ToUint8Array } from '@/lib/push-utils'

describe('urlBase64ToUint8Array', () => {
  it('converts a valid base64url-encoded VAPID key to ArrayBuffer', () => {
    // A known VAPID public key (65 bytes when decoded)
    const vapidKey =
      'BPU4n-Jd_eZ4qpyV8ezmXGQa5jp_0_okHtT9Egec9Vus2uSbn5vNji_iqTn_icXCWCnUjPH8fTlUBDUyeZIs4t4'

    const result = urlBase64ToUint8Array(vapidKey)

    expect(result).toBeInstanceOf(ArrayBuffer)
    expect(result.byteLength).toBe(65) // Uncompressed EC P-256 public key
  })

  it('adds padding correctly for input needing 1 pad char', () => {
    // "abc" in base64url (3 bytes → 4 base64 chars, needs no padding)
    // But "ab" (2 bytes) → "YWI" which needs 1 = pad
    const result = urlBase64ToUint8Array('YWI')
    const arr = new Uint8Array(result)
    expect(arr[0]).toBe(97) // 'a'
    expect(arr[1]).toBe(98) // 'b'
  })

  it('handles base64url characters (- and _)', () => {
    // '+' in base64 = '-' in base64url, '/' in base64 = '_' in base64url
    // "/+" in standard base64 = "_-" in base64url
    const result = urlBase64ToUint8Array('_-4')
    expect(result).toBeInstanceOf(ArrayBuffer)
  })

  it('returns empty buffer for empty input', () => {
    const result = urlBase64ToUint8Array('')
    expect(result.byteLength).toBe(0)
  })
})
