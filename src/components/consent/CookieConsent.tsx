'use client'

import { Button } from '@/components/ui/button'
import { useConsent } from './ConsentProvider'

export function CookieConsent() {
  const { showBanner, acceptCookies, rejectCookies } = useConsent()

  if (!showBanner) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg animate-in slide-in-from-bottom duration-300">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-700 text-center sm:text-left">
          Este portal utiliza cookies para análise de navegação, permitindo
          melhorar sua experiência. Ao aceitar, você concorda com a coleta de
          dados de uso.
        </p>
        <div className="flex gap-3 shrink-0">
          <Button variant="outline" size="sm" onClick={rejectCookies}>
            Recusar
          </Button>
          <Button size="sm" onClick={acceptCookies}>
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  )
}
