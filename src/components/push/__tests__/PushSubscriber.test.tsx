import { screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/__tests__/test-utils'

let mockSession: {
  data: { user: { id: string; name: string } } | null
  status: string
} = {
  data: null,
  status: 'unauthenticated',
}

vi.mock('next-auth/react', () => ({
  useSession: () => mockSession,
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function createMockSubscription(endpoint = 'https://fcm.example.com/send/abc') {
  return {
    endpoint,
    unsubscribe: vi.fn().mockResolvedValue(true),
    toJSON: () => ({
      endpoint,
      keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
    }),
  }
}

function setupBrowserAPIs(
  existingSubscription: ReturnType<typeof createMockSubscription> | null = null,
) {
  const mockPushManager = {
    getSubscription: vi.fn().mockResolvedValue(existingSubscription),
    subscribe: vi.fn().mockResolvedValue(createMockSubscription()),
  }

  const mockRegistration = {
    pushManager: mockPushManager,
    active: {},
    waiting: null,
    installing: null,
    scope: '/',
    getNotifications: vi.fn().mockResolvedValue([]),
  }

  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      ready: Promise.resolve(mockRegistration),
      getRegistration: vi.fn().mockResolvedValue(mockRegistration),
    },
    configurable: true,
  })

  Object.defineProperty(window, 'PushManager', {
    value: class {},
    configurable: true,
  })

  Object.defineProperty(window, 'Notification', {
    value: {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    },
    configurable: true,
  })

  return { mockPushManager, mockRegistration }
}

describe('PushSubscriber', () => {
  beforeEach(() => {
    mockSession = { data: null, status: 'unauthenticated' }
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'test-vapid-key-base64url')
    vi.stubEnv('NEXT_PUBLIC_PUSH_WORKER_URL', 'https://push-worker.example.com')

    setupBrowserAPIs()

    const store: Record<string, string> = {}
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key) => store[key] ?? null,
    )
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      store[key] = value
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete store[key]
    })

    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/push/filters-data')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              agencies: [
                {
                  key: 'mec',
                  name: 'Ministério da Educação',
                  type: 'Ministério',
                },
                { key: 'anvisa', name: 'ANVISA', type: 'Agência' },
              ],
            }),
            { status: 200 },
          ),
        )
      }
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      )
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('renders the bell button', async () => {
    const PushSubscriber = (await import('../PushSubscriber')).default
    render(<PushSubscriber />)

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })
  })

  it('opens sheet when bell is clicked', async () => {
    const PushSubscriber = (await import('../PushSubscriber')).default
    const { user } = render(<PushSubscriber />)

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Notificações WebPush')).toBeInTheDocument()
    })
  })

  it('shows agencies in the sheet', async () => {
    const PushSubscriber = (await import('../PushSubscriber')).default
    const { user } = render(<PushSubscriber />)

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Ministérios')).toBeInTheDocument()
      expect(screen.getByText('Ministério da Educação')).toBeInTheDocument()
    })
  })

  it('disables subscribe button when no agencies selected', async () => {
    const PushSubscriber = (await import('../PushSubscriber')).default
    const { user } = render(<PushSubscriber />)

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      const subscribeBtn = screen.getByRole('button', {
        name: /ativar notificações/i,
      })
      expect(subscribeBtn).toBeDisabled()
    })
  })

  it('shows hint text when no agencies selected', async () => {
    const PushSubscriber = (await import('../PushSubscriber')).default
    const { user } = render(<PushSubscriber />)

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(
        screen.getByText(/selecione ao menos um órgão/i),
      ).toBeInTheDocument()
    })
  })

  it('shows Clipping promo banner for unauthenticated users', async () => {
    mockSession = { data: null, status: 'unauthenticated' }
    const PushSubscriber = (await import('../PushSubscriber')).default
    const { user } = render(<PushSubscriber />)

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(
        screen.getByText(/para recursos avançados como clipping/i),
      ).toBeInTheDocument()
    })
  })

  it('shows Clippings link for authenticated users', async () => {
    mockSession = {
      data: { user: { id: 'user-123', name: 'João Silva' } },
      status: 'authenticated',
    }
    const PushSubscriber = (await import('../PushSubscriber')).default
    const { user } = render(<PushSubscriber />)

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: /clippings/i }),
      ).toBeInTheDocument()
    })
  })
})
