export async function generateEmbedding(
  text: string,
): Promise<number[] | null> {
  const url = process.env.EMBEDDINGS_API_URL
  const apiKey = process.env.EMBEDDINGS_API_KEY
  if (!url) return null

  try {
    const res = await fetch(`${url}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      },
      body: JSON.stringify({ texts: [text] }),
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data.embeddings?.[0] as number[]) ?? null
  } catch {
    return null
  }
}
