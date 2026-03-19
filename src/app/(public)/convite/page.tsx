import Link from 'next/link'
import { InviteCodeInput } from '@/components/invite/InviteCodeInput'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function ConvitePage() {
  return (
    <main className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Acesso por Convite</CardTitle>
          <CardDescription>
            Insira o código de convite que você recebeu para acessar o portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <InviteCodeInput />
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
