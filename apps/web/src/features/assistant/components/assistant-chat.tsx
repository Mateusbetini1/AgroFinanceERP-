'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Send } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { Textarea } from '@/components/ui/textarea'
import { cn, getApiErrorMessage } from '@/lib/utils'
import { sendAssistantMessage } from '../api'
import { AssistantDraftCard } from './assistant-draft-card'
import type { AssistantMessage } from '../types'

const suggestions = [
  'O que vence nos próximos 7 dias?',
  'Tenho boletos vencidos?',
  'Quanto tenho em despesas pendentes?',
  'Tenho safras cadastradas?',
  'Como está meu caixa nos próximos 30 dias?',
]

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function contextFromMessages(messages: AssistantMessage[]) {
  return messages
    .filter((item) => item.content.trim().length > 0)
    .slice(-8)
    .map((item) => ({
      role: item.role,
      content: item.content,
    }))
}

export function AssistantChat() {
  const pathname = usePathname()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: createId(),
      role: 'assistant',
      content: 'Faça uma pergunta sobre boletos, caixa, receitas, despesas ou safras. Nesta versão eu apenas consulto dados.',
      kind: 'ANSWER',
      sources: [],
    },
  ])

  const mutation = useMutation({
    mutationFn: sendAssistantMessage,
    onSuccess: (response) => {
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: 'assistant',
          content: response.answer,
          kind: response.kind,
          sources: response.sources,
          draft: response.draft,
        },
      ])
    },
    onError: (error) => {
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: 'assistant',
          content: getApiErrorMessage(error, 'Não foi possível consultar o assistente.'),
          kind: 'ERROR',
          sources: [],
        },
      ])
    },
  })

  const canSubmit = useMemo(() => message.trim().length > 0 && !mutation.isPending, [message, mutation.isPending])

  function submit(nextMessage?: string) {
    const content = (nextMessage ?? message).trim()
    if (!content || mutation.isPending) return

    const recentMessages = contextFromMessages(messages)
    setMessages((current) => [...current, { id: createId(), role: 'user', content }])
    setMessage('')
    mutation.mutate({
      message: content,
      context: {
        currentRoute: pathname,
        recentMessages,
      },
    })
  }

  function removeDraft(messageId: string) {
    setMessages((current) => current.map((item) => (item.id === messageId ? { ...item, draft: undefined } : item)))
  }

  function markDraftConfirmed(messageId: string) {
    setMessages((current) => [
      ...current.map((item) => (item.id === messageId ? { ...item, draft: undefined } : item)),
      {
        id: createId(),
        role: 'assistant',
        content: 'Rascunho confirmado e lançamento criado com sucesso.',
        kind: 'ANSWER',
        sources: [],
      },
    ])
  }

  return (
    <div className="grid min-h-[calc(100vh-9rem)] gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="flex min-h-[520px] flex-col">
        <CardHeader>
          <CardTitle className="text-base">Conversa</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4">
          <div className="flex-1 space-y-3 overflow-y-auto">
            {messages.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'rounded-lg border p-3 text-sm',
                  item.role === 'user'
                    ? 'ml-8 bg-primary text-primary-foreground'
                    : item.kind === 'ERROR'
                      ? 'mr-8 border-destructive/20 bg-destructive/10 text-destructive'
                      : 'mr-8 bg-muted/30 text-foreground',
                )}
              >
                <p className="whitespace-pre-wrap">{item.content}</p>
                {item.sources && item.sources.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.sources.map((source) =>
                      source.route ? (
                        <Link
                          key={`${source.label}:${source.route}`}
                          href={source.route}
                          className="rounded-md border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-accent"
                        >
                          {source.label}
                        </Link>
                      ) : (
                        <span key={source.label} className="rounded-md border bg-background px-2 py-1 text-xs text-foreground">
                          {source.label}
                        </span>
                      ),
                    )}
                  </div>
                )}
                {item.draft && (
                  <AssistantDraftCard
                    draft={item.draft}
                    onCancel={() => removeDraft(item.id)}
                    onConfirmed={() => markDraftConfirmed(item.id)}
                  />
                )}
              </div>
            ))}
            {mutation.isPending && (
              <div className="mr-8 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                Consultando dados...
              </div>
            )}
          </div>

          <div className="space-y-3 border-t pt-4">
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Pergunte sobre boletos, caixa, receitas, despesas ou safras..."
              rows={3}
              maxLength={1000}
            />
            <Button type="button" className="h-11 w-full" disabled={!canSubmit} loading={mutation.isPending} onClick={() => submit()}>
              <Send className="h-4 w-4" />
              Enviar
            </Button>
          </div>
        </CardContent>
      </Card>

      <aside className="space-y-4">
        <InlineAlert tone="success">
          O assistente é somente consultivo. Ele não cria, paga, edita ou exclui lançamentos.
        </InlineAlert>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sugestões rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                variant="outline"
                className="h-auto justify-start whitespace-normal py-3 text-left"
                disabled={mutation.isPending}
                onClick={() => submit(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
