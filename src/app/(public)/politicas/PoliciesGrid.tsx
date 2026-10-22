'use client'

import { useState } from 'react'
import type { PolicyItem } from '@/services/content/types'

// ---------- Labels e constantes ----------

const DOMAIN_LABELS: Record<string, string> = {
  SOCIAL: 'Social',
  ECONOMIC: 'Econômica',
  HEALTH: 'Saúde',
  EDUCATION: 'Educação',
  SECURITY: 'Segurança',
  ENVIRONMENT: 'Meio Ambiente',
  GOVERNANCE: 'Governança',
}

const PHASE_LABELS: Record<string, string> = {
  ANNOUNCED: 'Anunciada',
  REGULATION: 'Regulamentação',
  IMPLEMENTATION: 'Implementação',
  EVALUATION: 'Avaliação',
  ROUTINE: 'Rotina',
}

const DOMAIN_COLORS: Record<string, string> = {
  SOCIAL: 'bg-blue-100 text-blue-800',
  ECONOMIC: 'bg-green-100 text-green-800',
  HEALTH: 'bg-red-100 text-red-800',
  EDUCATION: 'bg-yellow-100 text-yellow-800',
  SECURITY: 'bg-gray-100 text-gray-800',
  ENVIRONMENT: 'bg-emerald-100 text-emerald-800',
  GOVERNANCE: 'bg-purple-100 text-purple-800',
}

const PHASE_COLORS: Record<string, string> = {
  ANNOUNCED: 'bg-sky-100 text-sky-800',
  REGULATION: 'bg-orange-100 text-orange-800',
  IMPLEMENTATION: 'bg-indigo-100 text-indigo-800',
  EVALUATION: 'bg-teal-100 text-teal-800',
  ROUTINE: 'bg-slate-100 text-slate-700',
}

// ---------- Componentes internos ----------

function PolicyCard({ policy }: { policy: PolicyItem }) {
  const domainLabel = policy.domain
    ? (DOMAIN_LABELS[policy.domain] ?? policy.domain)
    : null
  const phaseLabel = policy.lifecyclePhase
    ? (PHASE_LABELS[policy.lifecyclePhase] ?? policy.lifecyclePhase)
    : null

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-base font-semibold text-primary leading-snug">
        {policy.canonicalName}
      </h3>

      <div className="flex flex-wrap gap-1.5">
        {policy.domain && (
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${DOMAIN_COLORS[policy.domain] ?? 'bg-gray-100 text-gray-700'}`}
          >
            {domainLabel}
          </span>
        )}
        {policy.lifecyclePhase && (
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PHASE_COLORS[policy.lifecyclePhase] ?? 'bg-gray-100 text-gray-700'}`}
          >
            {phaseLabel}
          </span>
        )}
      </div>

      {policy.aliases.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Também conhecida como: {policy.aliases.join(', ')}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
        <span>{policy.articleCount} artigos</span>
        {policy.wikidataId && (
          <a
            href={`https://www.wikidata.org/wiki/${policy.wikidataId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Wikidata ↗
          </a>
        )}
      </div>
    </div>
  )
}

// ---------- Componente principal ----------

interface Props {
  policies: PolicyItem[]
}

export default function PoliciesGrid({ policies }: Props) {
  const [domain, setDomain] = useState<string>('')
  const [phase, setPhase] = useState<string>('')

  const domains = Array.from(
    new Set(policies.map((p) => p.domain).filter(Boolean)),
  ) as string[]
  const phases = Array.from(
    new Set(policies.map((p) => p.lifecyclePhase).filter(Boolean)),
  ) as string[]

  const filtered = policies.filter((p) => {
    if (domain && p.domain !== domain) return false
    if (phase && p.lifecyclePhase !== phase) return false
    return true
  })

  return (
    <div>
      {/* Filtros */}
      <div className="mb-8 flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="domain-filter"
            className="text-xs font-medium text-muted-foreground"
          >
            Área
          </label>
          <select
            id="domain-filter"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todas as áreas</option>
            {domains.map((d) => (
              <option key={d} value={d}>
                {DOMAIN_LABELS[d] ?? d}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="phase-filter"
            className="text-xs font-medium text-muted-foreground"
          >
            Fase
          </label>
          <select
            id="phase-filter"
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todas as fases</option>
            {phases.map((ph) => (
              <option key={ph} value={ph}>
                {PHASE_LABELS[ph] ?? ph}
              </option>
            ))}
          </select>
        </div>

        {(domain || phase) && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setDomain('')
                setPhase('')
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-muted-foreground hover:bg-gray-50"
            >
              Limpar filtros
            </button>
          </div>
        )}

        <div className="flex items-end ml-auto">
          <span className="text-sm text-muted-foreground">
            {filtered.length} política{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-muted-foreground">
          Nenhuma política encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((policy) => (
            <PolicyCard key={policy.entityId} policy={policy} />
          ))}
        </div>
      )}
    </div>
  )
}
