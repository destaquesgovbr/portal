'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClarityScript } from '@/components/analytics/ClarityScript'
import { GrowthBookProvider } from '@/components/analytics/GrowthBookProvider'
import { UmamiScript } from '@/components/analytics/UmamiScript'
import { ConsentProvider } from '@/components/consent/ConsentProvider'
import { CookieConsent } from '@/components/consent/CookieConsent'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConsentProvider>
      <GrowthBookProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <CookieConsent />
          <ClarityScript />
          <UmamiScript />
        </QueryClientProvider>
      </GrowthBookProvider>
    </ConsentProvider>
  )
}
