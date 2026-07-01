'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { Textarea } from '@/components/ui/textarea'
import { cn, getApiErrorMessage } from '@/lib/utils'
import { sendAssistantMessage } from '../api'
import { AssistantDraftCard } from './assistant-draft-card'
import type { AssistantDraft, AssistantDraftDestination, AssistantMessage } from '../types'

const suggestions = [
  'O que vence nos próximos 7 dias?',
  'Tenho boletos vencidos?',
  'Quanto tenho em despesas pendentes?',
  'Tenho safras cadastradas?',
  'Como está meu caixa nos próximos 30 dias?',
]

const initialAssistantMessage = 'Faça perguntas ou monte rascunhos de lançamentos. Nada é salvo sem sua confirmação.'

const draftDestinations: Record<AssistantDraft['draftType'], AssistantDraftDestination> = {
  CREATE_EXPENSE: { draftType: 'CREATE_EXPENSE', label: 'Despesas', route: '/expenses' },
  CREATE_BILL: { draftType: 'CREATE_BILL', label: 'Boletos', route: '/bills' },
  CREATE_BILL_INSTALLMENT_GROUP: {
    draftType: 'CREATE_BILL_INSTALLMENT_GROUP',
    label: 'Parcelamentos',
    route: '/bills/installments',
  },
  CREATE_REVENUE: { draftType: 'CREATE_REVENUE', label: 'Receitas', route: '/revenues' },
  CREATE_EMPLOYEE_PAYMENT: {
    draftType: 'CREATE_EMPLOYEE_PAYMENT',
    label: 'Pagamentos de funcionários',
    route: '/employee-payments',
  },
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createInitialMessages(): AssistantMessage[] {
  return [
    {
      id: createId(),
      role: 'assistant',
      content: initialAssistantMessage,
      kind: 'ANSWER',
      sources: [],
    },
  ]
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

function getOpenDraft(messages: AssistantMessage[]): { messageId: string; draft: AssistantDraft } | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const item = messages[index]
    if (item.draft && !item.confirmedDraft) return { messageId: item.id, draft: item.draft }
  }
  return null
}

export function AssistantChat() {
  const pathname = usePathname()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<AssistantMessage[]>(() => createInitialMessages())

  const mutation = useMutation({
    mutationFn: ({
      draftMessageId: _draftMessageId,
      ...payload
    }: {
      message: string
      context?: {
        currentRoute?: string
        currentDraft?: AssistantDraft
        recentMessages?: Array<{ role: 'user' | 'assistant'; content: string }>
      }
      draftMessageId?: string
    }) => sendAssistantMessage(payload),
    onSuccess: (response, variables) => {
      if (variables.draftMessageId && response.draft) {
        setMessages((current) =>
          current.map((item) =>
            item.id === variables.draftMessageId
              ? { ...item, content: response.answer, kind: response.kind, sources: response.sources, draft: response.draft }
              : item,
          ),
        )
        return
      }

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
    const openDraft = getOpenDraft(messages)
    setMessages((current) => [...current, { id: createId(), role: 'user', content }])
    setMessage('')
    mutation.mutate({
      message: content,
      context: {
        currentRoute: pathname,
        currentDraft: openDraft?.draft,
        recentMessages,
      },
      draftMessageId: openDraft?.messageId,
    })
  }

  function removeDraft(messageId: string) {
    setMessages((current) => current.map((item) => (item.id === messageId ? { ...item, draft: undefined } : item)))
  }

  function markDraftConfirmed(messageId: string, draftType: AssistantDraft['draftType']) {
    const destination = draftDestinations[draftType]
    setMessages((current) =>
      current.map((item) =>
        item.id === messageId
          ? {
              ...item,
              content: `Lançamento criado com sucesso. Ver em ${destination.label}.`,
              kind: 'ANSWER',
              sources: [{ label: `Ver em ${destination.label}`, route: destination.route }],
              confirmedDraft: destination,
            }
          : item,
      ),
    )
  }

  function updateDraft(messageId: string, draft: AssistantDraft) {
    setMessages((current) => current.map((item) => (item.id === messageId ? { ...item, draft } : item)))
  }

  function clearConversation() {
    if (mutation.isPending) return
    setMessage('')
    setMessages(createInitialMessages())
  }

  return (
    <div className="grid min-h-[calc(100vh-9rem)] gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="flex min-h-[520px] flex-col">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Conversa</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            disabled={mutation.isPending}
            onClick={clearConversation}
          >
            <Trash2 className="h-4 w-4" />
            Limpar conversa
          </Button>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4">
          <div className="flex-1 space-y-3 overflow-y-auto">
            {messages.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'rounded-lg border p-3 text-sm',
                  item.role === 'user'
                    ? 'ml-0 bg-primary text-primary-foreground sm:ml-8'
                    : item.kind === 'ERROR'
                      ? 'mr-0 border-destructive/20 bg-destructive/10 text-destructive sm:mr-8'
                      : 'mr-0 bg-muted/30 text-foreground sm:mr-8',
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
                          className="rounded-md border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent"
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
                    confirmedDestination={item.confirmedDraft}
                    onChange={(draft) => updateDraft(item.id, draft)}
                    onCancel={() => removeDraft(item.id)}
                    onConfirmed={(draftType) => markDraftConfirmed(item.id, draftType)}
                  />
                )}
              </div>
            ))}
            {mutation.isPending && (
              <div className="mr-0 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground sm:mr-8">
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
              className="min-h-[96px] text-base sm:text-sm"
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
          O assistente consulta dados e monta rascunhos de lançamentos. Nada é salvo sem sua confirmação.
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
