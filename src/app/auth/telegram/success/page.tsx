import Link from 'next/link'

export default function TelegramSuccessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-2xl font-bold">
        Conta Telegram vinculada com sucesso! 🎉
      </h1>
      <p className="text-muted-foreground max-w-sm">
        Volte ao Telegram e continue usando o bot.
      </p>
      <Link
        href="/meus-clippings"
        className="text-primary underline underline-offset-4 hover:opacity-80"
      >
        Ir para Meus Clippings
      </Link>
    </main>
  )
}
