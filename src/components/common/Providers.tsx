'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { ABDebugPanel, GrowthBookProvider } from '@/ab-testing'
import { ClarityScript } from '@/components/analytics/ClarityScript'
import { UmamiScript } from '@/components/analytics/UmamiScript'
import { ConsentProvider } from '@/components/consent/ConsentProvider'
import { CookieConsent } from '@/components/consent/CookieConsent'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ConsentProvider>
        <GrowthBookProvider>
          <QueryClientProvider client={queryClient}>
            {children}
            <CookieConsent />
            <ClarityScript />
            <UmamiScript />
            <ABDebugPanel />
          </QueryClientProvider>
        </GrowthBookProvider>
      </ConsentProvider>
    </SessionProvider>
  )
}
