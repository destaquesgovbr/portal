/**
 * Client for calling the clipping worker service.
 * Handles OIDC authentication for Cloud Run-to-Cloud Run calls.
 */

const WORKER_URL = process.env.CLIPPING_WORKER_URL

export async function callClippingWorker(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  if (!WORKER_URL) {
    throw new Error('CLIPPING_WORKER_URL not configured')
  }

  const url = `${WORKER_URL.replace(/\/$/, '')}${endpoint}`

  const isLocal =
    WORKER_URL.includes('localhost') || WORKER_URL.includes('127.0.0.1')

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (!isLocal) {
    const metadataUrl = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(WORKER_URL)}&format=full`
    const tokenRes = await fetch(metadataUrl, {
      headers: { 'Metadata-Flavor': 'Google' },
    })
    if (!tokenRes.ok) {
      throw new Error(`Failed to get identity token: ${tokenRes.status}`)
    }
    const token = await tokenRes.text()
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Worker responded with ${response.status}: ${text}`)
  }

  return response.json()
}
