import Link from 'next/link'
import { InviteLanding } from '@/components/invite/InviteLanding'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { validateInviteCode } from './actions'

interface Props {
  params: Promise<{ code: string }>
}

export default async function ConviteCodePage({ params }: Props) {
  const { code } = await params
  const result = await validateInviteCode(code)

  if (result.type !== 'ok') {
    return (
      <main className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Convite Inválido</CardTitle>
            <CardDescription>
              {result.type === 'err'
                ? String(result.error)
                : 'Ocorreu um erro ao validar o convite.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Não tem convite?{' '}
              <Link
                href="/lista-espera"
                className="underline hover:text-foreground"
              >
                Entre na lista de espera
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
      <InviteLanding code={code} inviterName={result.data.inviterName} />
    </main>
  )
}
