'use client'

import { ChevronDown, X } from 'lucide-react'
import * as React from 'react'
import { Portal } from '@/components/layout/Portal'
import { Button } from '@/components/ui/button'

type Theme = {
  key: string
  name: string
}

type ThemeNode = {
  code: string
  label: string
  children?: ThemeNode[]
}

type ThemeMultiSelectProps = {
  themes: Theme[]
  selectedThemes: string[]
  onSelectedThemesChange: (themes: string[]) => void
  themeHierarchy?: ThemeNode[]
}

// Helper to check if a node has any direct child explicitly selected
function hasAnyChildSelected(
  node: ThemeNode,
  selectedThemes: string[],
): boolean {
  if (!node.children || node.children.length === 0) return false
  return node.children.some((child) => selectedThemes.includes(child.code))
}

// Helper to check if some (but not all) direct children are selected
function isIndeterminate(node: ThemeNode, selectedThemes: string[]): boolean {
  if (!node.children || node.children.length === 0) return false

  const selectedChildren = node.children.filter(
    (child) =>
      selectedThemes.includes(child.code) ||
      hasAnyChildSelected(child, selectedThemes),
  )

  return (
    selectedChildren.length > 0 &&
    selectedChildren.length < node.children.length
  )
}

// Component for tree view items
function ThemeTreeItem({
  node,
  level = 0,
  selectedThemes,
  onToggle,
  expandedNodes,
  onExpandToggle,
  ancestorSelected = false,
}: {
  node: ThemeNode
  level?: number
  selectedThemes: string[]
  onToggle: (code: string) => void
  expandedNodes: Set<string>
  onExpandToggle: (code: string) => void
  ancestorSelected?: boolean
}) {
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expandedNodes.has(node.code)
  const isDirectlySelected = selectedThemes.includes(node.code)
  const isInherited = ancestorSelected && !isDirectlySelected
  const showAsChecked = isDirectlySelected || ancestorSelected
  const indeterminate =
    !isDirectlySelected &&
    !ancestorSelected &&
    isIndeterminate(node, selectedThemes)

  const checkboxRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors cursor-pointer group`}
        style={{ marginLeft: `${level * 16}px` }}
      >
        {hasChildren ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onExpandToggle(node.code)}
            className="h-6 w-6 p-0"
            aria-label={isExpanded ? 'Recolher' : 'Expandir'}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
            />
          </Button>
        ) : (
          <div className="w-4" />
        )}

        <input
          ref={checkboxRef}
          id={`theme-checkbox-${node.code}`}
          type="checkbox"
          checked={showAsChecked}
          onChange={() => onToggle(node.code)}
          className={`h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer ${isInherited ? 'opacity-60' : ''}`}
          disabled={isInherited}
        />

        <label
          htmlFor={`theme-checkbox-${node.code}`}
          className={`flex-1 text-left cursor-pointer text-sm font-medium ${isInherited ? 'text-muted-foreground' : ''}`}
        >
          {node.code} - {node.label}
        </label>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <ThemeTreeItem
              key={child.code}
              node={child}
              level={level + 1}
              selectedThemes={selectedThemes}
              onToggle={onToggle}
              expandedNodes={expandedNodes}
              onExpandToggle={onExpandToggle}
              ancestorSelected={isDirectlySelected || ancestorSelected}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ThemeMultiSelect({
  themes,
  selectedThemes,
  onSelectedThemesChange,
  themeHierarchy = [],
}: ThemeMultiSelectProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(
    new Set(),
  )

  const hierarchyNodes = React.useMemo(() => {
    return themeHierarchy && themeHierarchy.length > 0
      ? themeHierarchy
      : buildHierarchyFromFlat(themes)
  }, [themeHierarchy, themes])

  // Filter nodes based on search term
  const filteredNodes = React.useMemo(() => {
    if (!searchTerm.trim()) {
      return hierarchyNodes
    }

    const searchLower = searchTerm.toLowerCase()

    // Helper function to check if a node or any of its children match
    const _nodeMatches = (node: ThemeNode): boolean => {
      // Check if current node matches (label or code)
      if (
        node.label.toLowerCase().includes(searchLower) ||
        node.code.toLowerCase().includes(searchLower)
      ) {
        return true
      }
      // Check if any children match
      if (node.children) {
        return node.children.some((child) => _nodeMatches(child))
      }
      return false
    }

    // Helper function to filter and clone nodes
    const filterNode = (node: ThemeNode): ThemeNode | null => {
      const currentMatches =
        node.label.toLowerCase().includes(searchLower) ||
        node.code.toLowerCase().includes(searchLower)
      const filteredChildren =
        node.children
          ?.map((child) => filterNode(child))
          .filter((child): child is ThemeNode => child !== null) ?? []

      // Include node if it matches or has matching children
      if (currentMatches || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        }
      }
      return null
    }

    return hierarchyNodes
      .map((node) => filterNode(node))
      .filter((node): node is ThemeNode => node !== null)
  }, [hierarchyNodes, searchTerm])

  const toggleTheme = React.useCallback(
    (themeKey: string) => {
      onSelectedThemesChange(
        selectedThemes.includes(themeKey)
          ? selectedThemes.filter((key) => key !== themeKey)
          : [...selectedThemes, themeKey],
      )
    },
    [selectedThemes, onSelectedThemesChange],
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

  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isExpanded) {
        setIsExpanded(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isExpanded])

  return (
    <div className="relative w-full">
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsExpanded(true)}
        className="w-full justify-start font-normal bg-white hover:bg-gray-50"
      >
        <span
          className={
            selectedThemes.length === 0
              ? 'text-muted-foreground'
              : 'text-foreground'
          }
        >
          {selectedThemes.length === 0
            ? 'Selecione temas...'
            : `${selectedThemes.length} selecionado${selectedThemes.length > 1 ? 's' : ''}`}
        </span>
      </Button>

      {isExpanded && (
        <Portal>
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            {/* raw button: backdrop overlay — needs inset-0 positioning incompatible with Button sizing */}
            <button
              type="button"
              className="absolute inset-0 bg-black/50 animate-in fade-in-0 border-0"
              onClick={() => setIsExpanded(false)}
              aria-label="Fechar modal"
            />
            <div
              className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col animate-in zoom-in-95 relative z-[301]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="theme-select-title"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2
                  id="theme-select-title"
                  className="text-xl font-semibold text-primary"
                >
                  Selecionar Temas
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(false)}
                  className="rounded-full"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </Button>
              </div>

              <div className="p-6 border-b border-border flex gap-4">
                <input
                  type="text"
                  placeholder="Buscar temas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-4 py-3 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {filteredNodes.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum tema encontrado
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredNodes.map((node) => (
                      <ThemeTreeItem
                        key={node.code}
                        node={node}
                        level={0}
                        selectedThemes={selectedThemes}
                        onToggle={toggleTheme}
                        expandedNodes={expandedNodes}
                        onExpandToggle={toggleExpandNode}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-border flex items-center justify-between bg-gray-50">
                <span className="text-sm text-muted-foreground">
                  {selectedThemes.length} tema
                  {selectedThemes.length !== 1 ? 's' : ''} selecionado
                  {selectedThemes.length !== 1 ? 's' : ''}
                </span>
                <Button type="button" onClick={() => setIsExpanded(false)}>
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}

function buildHierarchyFromFlat(themes: Theme[]): ThemeNode[] {
  const roots: ThemeNode[] = []
  const map = new Map<string, ThemeNode>()

  for (const theme of themes) {
    const node: ThemeNode = {
      code: theme.key,
      label: theme.name,
      children: [],
    }
    map.set(theme.key, node)

    const indentLevel = (theme.name.length - theme.name.trimStart().length) / 2

    if (indentLevel === 0) {
      roots.push(node)
    }
  }

  const lastByLevel: Record<number, ThemeNode> = {}
  for (const theme of themes) {
    const indentLevel = (theme.name.length - theme.name.trimStart().length) / 2

    if (indentLevel > 0) {
      const parentLevel = indentLevel - 1
      const parent = lastByLevel[parentLevel]
      if (parent) {
        const node = map.get(theme.key)
        if (node) {
          parent.children?.push(node)
        }
      }
    }

    const node = map.get(theme.key)
    if (node) {
      lastByLevel[indentLevel] = node
    }
  }

  return roots
}
