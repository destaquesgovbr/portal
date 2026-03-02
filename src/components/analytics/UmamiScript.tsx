'use client'

import { useEffect } from 'react'
import { useConsent } from '@/components/consent/ConsentProvider'

const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
const UMAMI_SCRIPT_URL = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL

export function UmamiScript() {
  const { hasConsent } = useConsent()

  useEffect(() => {
    if (!UMAMI_WEBSITE_ID || !UMAMI_SCRIPT_URL || hasConsent !== true) {
      return
    }

    // Skip if already loaded
    if (document.getElementById('umami-script')) {
      return
    }

    const script = document.createElement('script')
    script.id = 'umami-script'
    script.async = true
    script.defer = true
    script.src = UMAMI_SCRIPT_URL
    script.setAttribute('data-website-id', UMAMI_WEBSITE_ID)
    document.head.appendChild(script)
  }, [hasConsent])

  return null
}
