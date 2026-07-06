import { getPolicies } from './actions'
import PoliciesGrid from './PoliciesGrid'

export const revalidate = 600

export const metadata = {
  title: 'Políticas Públicas | Destaques Gov.BR',
  description:
    'Explore as políticas públicas do governo federal organizadas por domínio e fase do ciclo de vida.',
}

export default async function PoliticasPage() {
  const policies = await getPolicies()

  return (
    <section className="py-16">
      <div className="container mx-auto px-4 text-center mb-12">
        <h2 className="text-3xl font-bold text-primary">Políticas Públicas</h2>
        <div className="mx-auto mt-3 w-40">
          <img src="/underscore.svg" alt="" />
        </div>
        <p className="mt-4 text-base text-primary/80">
          Acompanhe as principais políticas públicas do governo federal,
          organizadas por área e fase do ciclo de vida.
        </p>
      </div>

      <div className="container mx-auto px-4">
        <PoliciesGrid policies={policies} />
      </div>
    </section>
  )
}
