export const AGENCY_TYPE_GROUPS: {
  label: string
  types: string[] | null
}[] = [
  { label: 'Ministérios', types: ['Ministério'] },
  { label: 'Agências Reguladoras', types: ['Agência'] },
  { label: 'Autarquias', types: ['Autarquia'] },
  { label: 'Fundações e Institutos', types: ['Fundação', 'Instituto'] },
  { label: 'Empresas Públicas', types: ['Empresa Pública'] },
  { label: 'Outros Órgãos', types: null }, // catch-all
]
