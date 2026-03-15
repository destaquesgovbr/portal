'use client'

import { Download, Share2 } from 'lucide-react'
import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import type { Release } from '@/types/clipping'

type Props = {
  release: Release
}

export function ReleasePageClient({ release }: Props) {
  const handlePrint = useCallback(() => {
    window.print()
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

      {/* Rendered digest HTML — trusted content from our own digest_renderer */}
      <div
        className="release-content"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered HTML from our worker
        dangerouslySetInnerHTML={{ __html: release.digestHtml }}
      />
    </div>
  )
}
