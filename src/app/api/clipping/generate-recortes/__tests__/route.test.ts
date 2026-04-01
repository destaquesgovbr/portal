import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const WORKER_URL = 'http://localhost:8080'

describe('POST /api/clipping/generate-recortes', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.CLIPPING_WORKER_URL = WORKER_URL
  })

  it('returns 401 for unauthenticated requests', async () => {
    const { auth } = await import('@/auth')
    ;(vi.mocked(auth) as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const { POST } = await import('../route')
    const request = new NextRequest(
      'http://localhost/api/clipping/generate-recortes',
      {
        method: 'POST',
        body: JSON.stringify({ prompt: 'IA no governo' }),
        headers: { 'Content-Type': 'application/json' },
      },
    )

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('returns 400 for empty prompt', async () => {
    const { auth } = await import('@/auth')
    ;(vi.mocked(auth) as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'user-1' },
      expires: '',
    })

    const { POST } = await import('../route')
    const request = new NextRequest(
      'http://localhost/api/clipping/generate-recortes',
      {
        method: 'POST',
        body: JSON.stringify({ prompt: '  ' }),
        headers: { 'Content-Type': 'application/json' },
      },
    )

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('proxies to clipping worker and returns recortes', async () => {
    const { auth } = await import('@/auth')
    ;(vi.mocked(auth) as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'user-1' },
      expires: '',
    })

    const agentResponse = {
      recortes: [
        { title: 'IA', themes: ['06'], agencies: [], keywords: ['IA'] },
      ],
      explanation: 'Recorte focado em IA',
      suggested_name: 'IA Governamental',
      iterations: 3,
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(agentResponse),
    })

    const { POST } = await import('../route')
    const request = new NextRequest(
      'http://localhost/api/clipping/generate-recortes',
      {
        method: 'POST',
        body: JSON.stringify({ prompt: 'inteligencia artificial' }),
        headers: { 'Content-Type': 'application/json' },
      },
    )

    const response = await POST(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.recortes).toHaveLength(1)
    expect(body.suggested_name).toBe('IA Governamental')

    // Verify it called the worker
    expect(mockFetch).toHaveBeenCalledWith(
      `${WORKER_URL}/agent/generate-recortes`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ prompt: 'inteligencia artificial' }),
      }),
    )
  })

  it('returns 502 when worker fails', async () => {
    const { auth } = await import('@/auth')
    ;(vi.mocked(auth) as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'user-1' },
      expires: '',
    })

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    })

    const { POST } = await import('../route')
    const request = new NextRequest(
      'http://localhost/api/clipping/generate-recortes',
      {
        method: 'POST',
        body: JSON.stringify({ prompt: 'saude' }),
        headers: { 'Content-Type': 'application/json' },
      },
    )

    const response = await POST(request)
    expect(response.status).toBe(502)
  })
})
