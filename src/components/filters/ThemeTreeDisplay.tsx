'use client'

import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'
import { Button } from '@/components/ui/button'

export type ThemeNode = {
  code: string
  label: string
  children?: ThemeNode[]
}

type ThemeTreeDisplayProps = {
  themeHierarchy: ThemeNode[]
  articleCounts: Map<string, number>
}

// Component for tree view items
function ThemeTreeItem({
  node,
  level = 0,
  expandedNodes,
  onExpandToggle,
  articleCounts,
}: {
  node: ThemeNode
  level?: number
  expandedNodes: Set<string>
  onExpandToggle: (code: string) => void
  articleCounts: Map<string, number>
}) {
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expandedNodes.has(node.code)
  const count = articleCounts.get(node.code) ?? 0

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 hover:bg-accent/50 rounded-sm transition-colors group"
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        {hasChildren ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onExpandToggle(node.code)}
            className="h-6 w-6 p-0 flex-shrink-0"
            aria-label={isExpanded ? 'Recolher' : 'Expandir'}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform text-muted-foreground ${isExpanded ? '' : '-rotate-90'}`}
            />
          </Button>
        ) : (
          <div className="w-4 flex-shrink-0" />
        )}

        <Link
          href={`/busca?temas=${node.code}`}
          className="flex-1 flex items-center justify-between text-sm font-medium hover:text-primary transition-colors group-hover:underline"
        >
          <span>
            {node.code} - {node.label}
          </span>
          <span className="text-muted-foreground text-xs ml-2 flex-shrink-0">
            ({count})
          </span>
        </Link>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <ThemeTreeItem
              key={child.code}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onExpandToggle={onExpandToggle}
              articleCounts={articleCounts}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ThemeTreeDisplay({
  themeHierarchy,
  articleCounts,
}: ThemeTreeDisplayProps) {
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(
    new Set(),
  )

  const toggleExpandNode = React.useCallback((nodeCode: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeCode)) {
        next.delete(nodeCode)
      } else {
        next.add(nodeCode)
      }
      return next
    })
  }, [])

  return (
    <div className="w-full">
      <div className="space-y-1">
        {themeHierarchy.map((node) => (
          <ThemeTreeItem
            key={node.code}
            node={node}
            level={0}
            expandedNodes={expandedNodes}
            onExpandToggle={toggleExpandNode}
            articleCounts={articleCounts}
          />
        ))}
      </div>
    </div>
  )
}
