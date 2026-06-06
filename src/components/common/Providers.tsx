'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { Provider as UrqlProvider } from 'urql'
import { ABDebugPanel, GrowthBookProvider } from '@/ab-testing'
import { ClarityScript } from '@/components/analytics/ClarityScript'
import { UmamiScript } from '@/components/analytics/UmamiScript'
import { ConsentProvider } from '@/components/consent/ConsentProvider'
import { CookieConsent } from '@/components/consent/CookieConsent'
import { getClient as getGraphQLClient } from '@/lib/graphql/client'

const queryClient = new QueryClient()
const urqlClient = getGraphQLClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ConsentProvider>
        <GrowthBookProvider>
          <UrqlProvider value={urqlClient}>
            <QueryClientProvider client={queryClient}>
              {children}
              <CookieConsent />
              <ClarityScript />
              <UmamiScript />
              <ABDebugPanel />
            </QueryClientProvider>
          </UrqlProvider>
        </GrowthBookProvider>
      </ConsentProvider>
    </SessionProvider>
  )
}
