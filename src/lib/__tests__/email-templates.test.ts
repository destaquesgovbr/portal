import { describe, expect, it } from 'vitest'
import { renderWaitlistApprovalEmail } from '../email-templates'

describe('renderWaitlistApprovalEmail', () => {
  it('includes the invite code', () => {
    const html = renderWaitlistApprovalEmail({
      code: 'Abc12345',
      portalUrl: 'https://portal.example.com',
    })

    expect(html).toContain('Abc12345')
  })

  it('includes the direct invite link', () => {
    const html = renderWaitlistApprovalEmail({
      code: 'Abc12345',
      portalUrl: 'https://portal.example.com',
    })

    expect(html).toContain('https://portal.example.com/convite/Abc12345')
  })

  it('includes the user name when provided', () => {
    const html = renderWaitlistApprovalEmail({
      name: 'Maria Silva',
      code: 'Abc12345',
      portalUrl: 'https://portal.example.com',
    })

    expect(html).toContain('Maria Silva')
  })

  it('uses generic greeting when name is not provided', () => {
    const html = renderWaitlistApprovalEmail({
      code: 'Abc12345',
      portalUrl: 'https://portal.example.com',
    })

    expect(html).not.toContain('undefined')
    expect(html).toContain('Olá')
  })

  it('contains gov.br branding color', () => {
    const html = renderWaitlistApprovalEmail({
      code: 'Abc12345',
      portalUrl: 'https://portal.example.com',
    })

    expect(html).toContain('#1351b4')
  })
})
