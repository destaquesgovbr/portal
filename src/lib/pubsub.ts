/**
 * Fire-and-forget Pub/Sub publish. Used for cover image generation.
 * Extracted to a separate module so it can be mocked in tests.
 */
export async function publishMarketplaceEvent(
  listingId: string,
  action: string,
) {
  try {
    const { PubSub } = await import('@google-cloud/pubsub')
    const pubsub = new PubSub({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    })
    await pubsub.topic('dgb.marketplace.published').publishMessage({
      json: { listingId, action },
    })
  } catch (err) {
    console.error('Failed to publish cover generation event:', err)
  }
}
