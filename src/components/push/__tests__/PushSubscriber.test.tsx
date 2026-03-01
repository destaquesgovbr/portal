import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@/__tests__/test-utils'
import { screen, waitFor } from '@testing-library/react'

// Mock the module-level constants by mocking the whole module
vi.mock('../PushSubscriber', async () => {
  // We need to mock process.env BEFORE the module loads
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-vapid-key-base64url'
  process.env.NEXT_PUBLIC_PUSH_WORKER_URL = 'https://push-worker.example.com'

  const actual = await vi.importActual('../PushSubscriber') as Record<string, unknown>
  return actual
})

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Helper to create mock PushSubscription
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

function setupBrowserAPIs(existingSubscription: ReturnType<typeof createMockSubscription> | null = null) {
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
    setupBrowserAPIs()

    // Mock localStorage
    const store: Record<string, string> = {}
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] ?? null)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => { store[key] = value })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => { delete store[key] })

    // Mock fetch
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
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
      expect(screen.getByText('Notificações Push')).toBeInTheDocument()
    })
  })

  it('shows theme checkboxes in the sheet', async () => {
    const PushSubscriber = (await import('../PushSubscriber')).default
    const { user } = render(<PushSubscriber />)

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Educação')).toBeInTheDocument()
      expect(screen.getByText('Saúde')).toBeInTheDocument()
      expect(screen.getByText('Turismo')).toBeInTheDocument()
    })
  })

  it('disables subscribe button when no themes selected', async () => {
    const PushSubscriber = (await import('../PushSubscriber')).default
    const { user } = render(<PushSubscriber />)

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      const subscribeBtn = screen.getByRole('button', { name: /ativar notificações/i })
      expect(subscribeBtn).toBeDisabled()
    })
  })

  it('enables subscribe button when a theme is selected', async () => {
    const PushSubscriber = (await import('../PushSubscriber')).default
    const { user } = render(<PushSubscriber />)

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Educação')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Educação'))

    const subscribeBtn = screen.getByRole('button', { name: /ativar notificações/i })
    expect(subscribeBtn).not.toBeDisabled()
  })

  it('calls subscribe endpoint with selected filters', async () => {
    const PushSubscriber = (await import('../PushSubscriber')).default
    const { user } = render(<PushSubscriber />)

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Educação')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Educação'))
    await user.click(screen.getByRole('button', { name: /ativar notificações/i }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'https://push-worker.example.com/subscribe',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"type":"theme_l1"'),
        }),
      )
    })
  })

  it('shows hint text when no themes selected', async () => {
    const PushSubscriber = (await import('../PushSubscriber')).default
    const { user } = render(<PushSubscriber />)

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText(/selecione ao menos um tema/i)).toBeInTheDocument()
    })
  })
})

