import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('sendEmail', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 202 }),
    )
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  it('sends email via SendGrid API', async () => {
    process.env.SENDGRID_API_KEY = 'test-api-key'
    process.env.EMAIL_FROM_ADDRESS = 'test@example.com'

    const { sendEmail } = await import('../email')
    await sendEmail({
      to: 'user@example.com',
      subject: 'Test Subject',
      html: '<p>Hello</p>',
    })

    expect(fetch).toHaveBeenCalledOnce()
    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://api.sendgrid.com/v3/mail/send')
    expect(options?.method).toBe('POST')
    expect(options?.headers).toMatchObject({
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
    })

    const body = JSON.parse(options?.body as string)
    expect(body.personalizations[0].to[0].email).toBe('user@example.com')
    expect(body.from.email).toBe('test@example.com')
    expect(body.from.name).toBe('Destaques Gov.br')
    expect(body.subject).toBe('Test Subject')
    expect(body.content[0].value).toBe('<p>Hello</p>')
  })

  it('skips sending when SENDGRID_API_KEY is not set', async () => {
    delete process.env.SENDGRID_API_KEY

    const { sendEmail } = await import('../email')
    await sendEmail({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    })

    expect(fetch).not.toHaveBeenCalled()
  })

  it('uses default from address when EMAIL_FROM_ADDRESS is not set', async () => {
    process.env.SENDGRID_API_KEY = 'test-api-key'
    delete process.env.EMAIL_FROM_ADDRESS

    const { sendEmail } = await import('../email')
    await sendEmail({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    })

    const body = JSON.parse(
      vi.mocked(fetch).mock.calls[0][1]?.body as string,
    )
    expect(body.from.email).toBe('noreply@destaquesgovbr.gov.br')
  })

  it('logs error on SendGrid failure without throwing', async () => {
    process.env.SENDGRID_API_KEY = 'test-api-key'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad request'),
      }),
    )

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { sendEmail } = await import('../email')

    await expect(
      sendEmail({ to: 'a@b.com', subject: 'x', html: '<p>x</p>' }),
    ).resolves.not.toThrow()

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[email]'),
      400,
      'Bad request',
    )
  })
})
