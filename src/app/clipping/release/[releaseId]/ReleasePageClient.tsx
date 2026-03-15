'use client'

import { Download, Share2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Release } from '@/types/clipping'

type Props = {
  release: Release
}

export function ReleasePageClient({ release }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeHeight, setIframeHeight] = useState(800)

  const handlePrint = useCallback(() => {
    const iframe = iframeRef.current
    if (iframe?.contentWindow) {
      iframe.contentWindow.print()
    }
  }, [])

  const handleShare = useCallback(async () => {
    const shareData = {
      title: `Clipping: ${release.clippingName}`,
      url: release.releaseUrl,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(release.releaseUrl)
    }
  }, [release])

  // Auto-resize iframe to fit content
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const handleLoad = () => {
      try {
        const body = iframe.contentDocument?.body
        if (body) {
          setIframeHeight(body.scrollHeight + 32)
        }
      } catch {
        // cross-origin restriction — shouldn't happen with srcdoc
      }
    }

    iframe.addEventListener('load', handleLoad)
    return () => iframe.removeEventListener('load', handleLoad)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Action bar (hidden on print) */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-sm font-medium text-gray-600 truncate">
            Clipping: {release.clippingName}
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="cursor-pointer"
            >
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="cursor-pointer"
            >
              <Share2 className="h-4 w-4 mr-1" />
              Compartilhar
            </Button>
          </div>
        </div>
      </div>

      {/* Rendered digest HTML in isolated iframe to prevent CSS leaks */}
      <iframe
        ref={iframeRef}
        srcDoc={release.digestHtml}
        title={`Clipping: ${release.clippingName}`}
        className="w-full border-0"
        style={{ height: iframeHeight }}
      />
    </div>
  )
}
