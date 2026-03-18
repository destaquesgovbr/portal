const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send'

export async function sendEmail({
  to,
  subject,
  html,
}: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    console.warn('[email] SENDGRID_API_KEY not set, skipping email')
    return
  }

  const response = await fetch(SENDGRID_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: {
        email:
          process.env.EMAIL_FROM_ADDRESS ?? 'noreply@destaquesgovbr.gov.br',
        name: 'Destaques Gov.br',
      },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  })

  if (!response.ok) {
    console.error('[email] SendGrid error:', response.status, await response.text())
  }
}
