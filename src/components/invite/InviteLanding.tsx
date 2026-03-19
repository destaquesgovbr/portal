'use client'

import { LogIn } from 'lucide-react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface InviteLandingProps {
  code: string
  inviterName: string | null
}

export function InviteLanding({ code, inviterName }: InviteLandingProps) {
  function handleSignIn() {
    signIn(undefined, { callbackUrl: `/convite/${code}/redeem` })
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">
          {inviterName
            ? `${inviterName} convidou você!`
            : 'Você recebeu um convite para acessar o DestaquesGovBr'}
        </CardTitle>
        <CardDescription>
          Acesse o portal para acompanhar notícias do Governo Federal com
          funcionalidades exclusivas.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Button onClick={handleSignIn} size="lg" className="gap-2 w-full">
          <LogIn className="h-5 w-5" />
          Entrar
        </Button>
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
  )
}
