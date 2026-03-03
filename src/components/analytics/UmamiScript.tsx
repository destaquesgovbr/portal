'use client'

import Script from 'next/script'
import { useConsent } from '@/components/consent/ConsentProvider'

const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
const UMAMI_SCRIPT_URL = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL

export function UmamiScript() {
  const { hasConsent } = useConsent()

  if (!UMAMI_WEBSITE_ID || !UMAMI_SCRIPT_URL || hasConsent !== true) {
    return null
  }

  return (
    <Script
      id="umami-script"
      src={UMAMI_SCRIPT_URL}
      data-website-id={UMAMI_WEBSITE_ID}
      strategy="afterInteractive"
    />
  )
}
