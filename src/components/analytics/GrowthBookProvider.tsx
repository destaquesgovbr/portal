'use client'

import {
  GrowthBookProvider as GBProvider,
  GrowthBook,
} from '@growthbook/growthbook-react'
import { useEffect, useState } from 'react'

const GROWTHBOOK_API_HOST = process.env.NEXT_PUBLIC_GROWTHBOOK_API_HOST
const GROWTHBOOK_CLIENT_KEY = process.env.NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY

export function GrowthBookProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [gb] = useState(() => {
    if (!GROWTHBOOK_API_HOST || !GROWTHBOOK_CLIENT_KEY) {
      return null
    }

    return new GrowthBook({
      apiHost: GROWTHBOOK_API_HOST,
      clientKey: GROWTHBOOK_CLIENT_KEY,
      enableDevMode: process.env.NODE_ENV === 'development',
    })
  })

  useEffect(() => {
    gb?.init({ streaming: true })
    return () => {
      gb?.destroy()
    }
  }, [gb])

  if (!gb) {
    return <>{children}</>
  }

  return <GBProvider growthbook={gb}>{children}</GBProvider>
}
