'use client'

import { useGrowthBook } from '@growthbook/growthbook-react'
import { useState } from 'react'
import { useABTestingContext } from '../GrowthBookProvider'
import { isGrowthBookConfigured } from '../growthbook'

/**
 * Debug panel for viewing A/B testing state in development
 * Only visible in development mode
 */
export function ABDebugPanel() {
  const [isOpen, setIsOpen] = useState(false)

  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-[9999] bg-purple-600 text-white px-3 py-2 rounded-md text-xs font-mono shadow-lg hover:bg-purple-700 transition-colors"
        aria-label="Toggle A/B Testing Debug Panel"
      >
        A/B Debug
      </button>

      {isOpen && <DebugPanelContent onClose={() => setIsOpen(false)} />}
    </>
  )
}

interface DebugPanelContentProps {
  onClose: () => void
}

function DebugPanelContent({ onClose }: DebugPanelContentProps) {
  const { userId, isReady } = useABTestingContext()
  const isConfigured = isGrowthBookConfigured()

  return (
    <div className="fixed bottom-16 right-4 z-[9999] bg-white border border-gray-300 rounded-lg shadow-xl w-96 max-h-[70vh] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <h3 className="font-bold text-sm">A/B Testing Debug</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Close debug panel"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="p-3 overflow-auto flex-1">
        {/* Status */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isConfigured && isReady
                  ? 'bg-green-500'
                  : isConfigured
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-gray-600">
              {isConfigured
                ? isReady
                  ? 'Connected'
                  : 'Loading...'
                : 'Not Configured'}
            </span>
          </div>

          {!isConfigured && (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
              Set NEXT_PUBLIC_GROWTHBOOK_API_HOST and
              NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY to enable A/B testing
            </div>
          )}
        </div>

        {/* User ID */}
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 mb-1">User ID</div>
          <div className="font-mono text-xs bg-gray-100 p-2 rounded break-all">
            {userId || 'Not set'}
          </div>
        </div>

        {/* Features (only if configured) */}
        {isConfigured && isReady && <FeaturesSection />}
      </div>
    </div>
  )
}

function FeaturesSection() {
  const growthbook = useGrowthBook()

  if (!growthbook) {
    return (
      <div className="text-xs text-gray-500">GrowthBook not initialized</div>
    )
  }

  const features = growthbook.getFeatures()
  const featureKeys = Object.keys(features)

  if (featureKeys.length === 0) {
    return (
      <div className="text-xs text-gray-500">
        No features loaded. Create experiments in the GrowthBook dashboard.
      </div>
    )
  }

  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-2">
        Features ({featureKeys.length})
      </div>
      <div className="space-y-2">
        {featureKeys.map((key) => {
          const result = growthbook.evalFeature(key)

          return (
            <div key={key} className="border rounded p-2 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium truncate">{key}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                    result.on
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {result.on ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="font-mono text-gray-600 bg-gray-50 p-1 rounded">
                {JSON.stringify(result.value)}
              </div>
              {result.experimentResult && (
                <div className="mt-1 text-gray-500">
                  Variant: {result.experimentResult.key} (
                  {result.experimentResult.variationId})
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
