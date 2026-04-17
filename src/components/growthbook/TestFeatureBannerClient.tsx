'use client'

import { useFeatureIsOn } from '@growthbook/growthbook-react'
import { AlertCircle } from 'lucide-react'

/**
 * Banner de teste do GrowthBook (Client Component)
 * Este componente só é renderizado quando o GrowthBookProvider está ativo
 */
export function TestFeatureBannerClient() {
  // Hook do GrowthBook para verificar se a feature está ativa
  const enabled = useFeatureIsOn('test-feature')

  // Debug: log para verificar o valor
  console.log(
    '[TestFeatureBannerClient] Feature test-feature enabled:',
    enabled,
  )

  // Se a feature não estiver ativa, não renderiza nada
  if (!enabled) return null

  return (
    <div className="fixed top-[110px] md:top-[130px] left-0 right-0 z-40 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 shadow-lg">
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm sm:text-base">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <p className="font-medium">
          🎉 GrowthBook está funcionando! Esta feature flag está{' '}
          <strong>ATIVA</strong> em produção.
        </p>
      </div>
    </div>
  )
}
