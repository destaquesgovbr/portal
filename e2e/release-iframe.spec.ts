import { expect, test } from '@playwright/test'

test('release iframe shows all content without cutoff', async ({ page }) => {
  // Navigate to a known release
  await page.goto('/clipping/release/f4994963bde044038cb21686a0efa391')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000) // Wait for iframe resize

  const iframe = page.frameLocator('iframe')

  // Check the last visible text in the digest (footer of the email template)
  const footerText = iframe.getByText(/preferências/i).first()
  const isVisible = await footerText.isVisible().catch(() => false)

  if (!isVisible) {
    // If no footer text, at least verify iframe height covers body
    const iframeEl = page.locator('iframe')
    const iframeHeight = await iframeEl.evaluate(
      (el) => (el as HTMLIFrameElement).offsetHeight,
    )
    const bodyHeight = await iframeEl.evaluate((el) => {
      const doc = (el as HTMLIFrameElement).contentDocument
      return doc?.body?.scrollHeight ?? 0
    })

    // iframe should be at least as tall as the body content
    expect(iframeHeight).toBeGreaterThanOrEqual(bodyHeight)
    return
  }

  // Footer text should be visible (not cut off)
  await expect(footerText).toBeVisible()

  // Verify the text is within the viewport (not hidden by overflow)
  const box = await footerText.boundingBox()
  expect(box).not.toBeNull()

  const viewport = page.viewportSize()
  if (box && viewport) {
    // The bottom of the text should be above the bottom of the page
    // (accounting for page scroll)
    const pageHeight = await page.evaluate(
      () => document.documentElement.scrollHeight,
    )
    expect(box.y + box.height).toBeLessThanOrEqual(pageHeight)
  }
})
