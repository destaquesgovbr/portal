'use client'

import { useABTestingContext } from '@/ab-testing'
import { isGrowthBookConfigured } from '@/ab-testing/growthbook'
import { TestFeatureBannerClient } from '@/components/growthbook/TestFeatureBannerClient'

/**
 * Banner de teste do GrowthBook (Server-safe wrapper)
 * Exibe um banner no topo da página quando a feature "test-feature" está ativada
 */
export default function TestFeatureBanner() {
  const { isReady } = useABTestingContext()

  // Aguarda o GrowthBook estar pronto antes de renderizar
  if (!isReady) return null

  // Se o GrowthBook não estiver configurado, não renderiza
  if (!isGrowthBookConfigured()) {
    return null
  }

  // Renderiza o componente cliente que usa hooks do GrowthBook
  return <TestFeatureBannerClient />
}
