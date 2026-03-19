'use client'

import { Button } from '@/components/ui/button'

const MAX_CHARS = 2000

type Props = {
  value: string
  onChange: (v: string) => void
  defaultPrompt: string
}

export function PromptEditor({ value, onChange, defaultPrompt }: Props) {
  const remaining = MAX_CHARS - value.length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="prompt-editor-textarea"
          className="text-sm font-medium text-foreground"
        >
          Prompt de resumo
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(defaultPrompt)}
          className="text-xs cursor-pointer"
        >
          Restaurar padrão
        </Button>
      </div>
      <textarea
        id="prompt-editor-textarea"
        value={value}
        onChange={(e) => {
          if (e.target.value.length <= MAX_CHARS) {
            onChange(e.target.value)
          }
        }}
        rows={8}
        maxLength={MAX_CHARS}
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
        placeholder="Digite o prompt para geração do resumo..."
      />
      <p
        className={`text-xs text-right ${remaining < 100 ? 'text-destructive' : 'text-muted-foreground'}`}
      >
        {value.length}/{MAX_CHARS} caracteres
      </p>
    </div>
  )
}
