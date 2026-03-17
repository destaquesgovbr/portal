import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { WaitlistForm } from '@/components/waitlist/WaitlistForm'
import { ActionState } from '@/types/action-state'
import { submitToWaitlist } from './actions'

export default function ListaEsperaPage() {
  return (
    <main className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Lista de Espera</CardTitle>
          <CardDescription>
            O DestaquesGovBr está em fase de testes. Deixe seu email para
            receber um convite quando novas vagas estiverem disponíveis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WaitlistForm
            onSubmitAction={async (formData) => {
              'use server'
              const result = await submitToWaitlist(
                ActionState.idle() as ActionState<string>,
                formData,
              )
              return result
            }}
          />
        </CardContent>
      </Card>
    </main>
  )
}
