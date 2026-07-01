'use client'

import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/feedback/inline-alert'
import { getApiErrorMessage } from '@/lib/utils'
import { confirmAssistantDraft } from '../api'
import type { AssistantDraft } from '../types'

const draftLabels: Record<AssistantDraft['draftType'], string> = {
  CREATE_EXPENSE: 'Despesa',
  CREATE_BILL: 'Boleto',
  CREATE_EMPLOYEE_PAYMENT: 'Pagamento de funcionário',
}

const fieldLabels: Record<string, string> = {
  amount: 'valor',
  categoryId: 'categoria',
  accountId: 'conta',
  employeeId: 'funcionário',
  dueDate: 'vencimento',
}

function formatValue(value: unknown) {
  if (value === undefined || value === null || value === '') return 'Não informado'
  if (typeof value === 'number') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  if (value instanceof Date) return new Intl.DateTimeFormat('pt-BR').format(value)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value))
  }
  return String(value)
}

export function AssistantDraftCard({
  draft,
  onCancel,
  onConfirmed,
}: {
  draft: AssistantDraft
  onCancel: () => void
  onConfirmed: () => void
}) {
  const mutation = useMutation({
    mutationFn: () => confirmAssistantDraft(draft),
    onSuccess: onConfirmed,
  })
  const canConfirm = draft.missingFields.length === 0 && !mutation.isPending

  return (
    <div className="mt-3 rounded-lg border bg-background p-3">
      <div className="mb-3">
        <p className="text-sm font-semibold">Rascunho: {draftLabels[draft.draftType]}</p>
        <p className="text-xs text-muted-foreground">Revise antes de confirmar. Nada foi salvo ainda.</p>
      </div>

      <dl className="grid gap-2 text-xs">
        {Object.entries(draft.payload).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-3 border-b pb-1 last:border-b-0">
            <dt className="text-muted-foreground">{fieldLabels[key] ?? key}</dt>
            <dd className="max-w-[65%] text-right font-medium">{formatValue(value)}</dd>
          </div>
        ))}
      </dl>

      {draft.missingFields.length > 0 && (
        <div className="mt-3">
          <InlineAlert tone="error">
            Faltam campos para confirmar: {draft.missingFields.map((field) => fieldLabels[field] ?? field).join(', ')}.
          </InlineAlert>
        </div>
      )}

      {mutation.isError && (
        <div className="mt-3">
          <InlineAlert tone="error">{getApiErrorMessage(mutation.error, 'Não foi possível confirmar o rascunho.')}</InlineAlert>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Button type="button" className="flex-1" disabled={!canConfirm} loading={mutation.isPending} onClick={() => mutation.mutate()}>
          Confirmar
        </Button>
        <Button type="button" variant="outline" className="flex-1" disabled={mutation.isPending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
