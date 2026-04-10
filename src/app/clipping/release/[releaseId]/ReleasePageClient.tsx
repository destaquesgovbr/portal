'use client'

import { Download, ExternalLink, Search, Share2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Recorte, Release } from '@/types/clipping'

type Props = {
  release: Release & {
    recortes: Recorte[]
    marketplaceListingId?: string | null
  }
}

export function ReleasePageClient({ release }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeHeight, setIframeHeight] = useState(800)
  const articlesUrl = `/clipping/release/${release.id}/artigos`

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

  // Auto-resize iframe to fit content without scrollbar
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const syncHeight = () => {
      try {
        const doc = iframe.contentDocument
        if (doc) {
          // Use the max of body and documentElement to capture all content
          const bodyH = doc.body?.scrollHeight ?? 0
          const docH = doc.documentElement?.scrollHeight ?? 0
          setIframeHeight(Math.max(bodyH, docH) + 40) // 40px buffer for margins
        }
      } catch {
        // cross-origin — shouldn't happen with srcdoc
      }
    }

    const handleLoad = () => {
      syncHeight()
      // Watch for layout changes (images loading, fonts, etc.)
      try {
        const body = iframe.contentDocument?.body
        if (body) {
          const observer = new ResizeObserver(syncHeight)
          observer.observe(body)
        }
      } catch {
        // fallback: poll a few times
        setTimeout(syncHeight, 500)
        setTimeout(syncHeight, 1500)
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
            {release.marketplaceListingId ? (
              <Link
                href={`/clippings/${release.marketplaceListingId}`}
                className="hover:text-gray-900 inline-flex items-center gap-1"
              >
                {release.clippingName}
                <ExternalLink className="h-3 w-3" />
              </Link>
            ) : (
              <>Clipping: {release.clippingName}</>
            )}
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
        scrolling="no"
        className="w-full border-0 overflow-hidden"
        style={{ height: iframeHeight }}
      />

      {/* Link to articles included in this release */}
      {release.recortes.length > 0 && (
        <div className="print:hidden max-w-3xl mx-auto px-4 py-6">
          <Link
            href={articlesUrl}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Search className="h-4 w-4" />
            Ver as {release.articlesCount} notícias incluídas nesta edição
          </Link>
        </div>
      )}
    </div>
  )
}
