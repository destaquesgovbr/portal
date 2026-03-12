import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/__tests__/test-utils'

// Mock next-auth/react — default to unauthenticated; tests can override
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
    // Reset to unauthenticated before each test
    mockSession = { data: null, status: 'unauthenticated' }
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'test-vapid-key-base64url')
    vi.stubEnv('NEXT_PUBLIC_PUSH_WORKER_URL', 'https://push-worker.example.com')

    setupBrowserAPIs()

    // Mock localStorage
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

    // Mock fetch — return theme data for filters-data endpoint
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/push/filters-data')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              themes: [
                { code: '01', label: 'Educação' },
                { code: '02', label: 'Saúde' },
                { code: '03', label: 'Turismo' },
              ],
              agencies: [],
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

  it('shows theme checkboxes in the sheet', async () => {
    const PushSubscriber = (await import('../PushSubscriber')).default
    const { user } = render(<PushSubscriber />)

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button'))

    // Open ThemeMultiSelect modal
    await waitFor(() => {
      expect(screen.getByText('Selecione temas...')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Selecione temas...'))

    await waitFor(() => {
      expect(screen.getByText(/Educação/)).toBeInTheDocument()
      expect(screen.getByText(/Saúde/)).toBeInTheDocument()
      expect(screen.getByText(/Turismo/)).toBeInTheDocument()
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
      const subscribeBtn = screen.getByRole('button', {
        name: /ativar notificações/i,
      })
      expect(subscribeBtn).toBeDisabled()
    })
  })

  it('enables subscribe button when a theme is selected', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const PushSubscriber = (await import('../PushSubscriber')).default
    render(<PushSubscriber />)

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button'))

    // Open ThemeMultiSelect modal
    await waitFor(() => {
      expect(screen.getByText('Selecione temas...')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Selecione temas...'))

    await waitFor(() => {
      expect(screen.getByText(/Educação/)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('checkbox', { name: /Educação/ }))

    // Close modal via Confirmar button
    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    const subscribeBtn = screen.getByRole('button', {
      name: /ativar notificações/i,
    })
    expect(subscribeBtn).not.toBeDisabled()
  })

  it('calls subscribe endpoint with selected filters', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const PushSubscriber = (await import('../PushSubscriber')).default
    render(<PushSubscriber />)

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button'))

    // Open ThemeMultiSelect modal
    await waitFor(() => {
      expect(screen.getByText('Selecione temas...')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Selecione temas...'))

    await waitFor(() => {
      expect(screen.getByText(/Educação/)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('checkbox', { name: /Educação/ }))

    // Close modal via Confirmar button
    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    await user.click(
      screen.getByRole('button', { name: /ativar notificações/i }),
    )

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
      expect(
        screen.getByText(/selecione ao menos um filtro/i),
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
      expect(
        screen.getByRole('link', { name: /faça login/i }),
      ).toBeInTheDocument()
    })
  })

  it('shows Minha Conta link for authenticated users', async () => {
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
      expect(screen.getByText(/gerencie seus/i)).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: /clippings/i }),
      ).toBeInTheDocument()
    })
  })

  it('banner contains correct links', async () => {
    // Test unauthenticated link
    mockSession = { data: null, status: 'unauthenticated' }
    const PushSubscriberUnauth = (await import('../PushSubscriber')).default
    const { user: userUnauth, unmount } = render(<PushSubscriberUnauth />)

    await waitFor(() => expect(screen.getByRole('button')).toBeInTheDocument())
    await userUnauth.click(screen.getByRole('button'))

    await waitFor(() => {
      const loginLink = screen.getByRole('link', { name: /faça login/i })
      expect(loginLink).toHaveAttribute('href', '/api/auth/signin')
    })

    unmount()

    // Test authenticated link
    mockSession = {
      data: { user: { id: 'user-123', name: 'João Silva' } },
      status: 'authenticated',
    }
    vi.resetModules()
    const PushSubscriberAuth = (await import('../PushSubscriber')).default
    const { user: userAuth } = render(<PushSubscriberAuth />)

    await waitFor(() => expect(screen.getByRole('button')).toBeInTheDocument())
    await userAuth.click(screen.getByRole('button'))

    await waitFor(() => {
      const clippingLink = screen.getByRole('link', { name: /clippings/i })
      expect(clippingLink).toHaveAttribute('href', '/minha-conta/clipping')
    })
  })
})
