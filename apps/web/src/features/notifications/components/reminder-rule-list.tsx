'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ReminderRuleCard } from './reminder-rule-card'
import type { ReminderRule } from '../reminder-api'

export function ReminderRuleList({
  rules,
  isLoading,
  isError,
  busyId,
  onNew,
  onEdit,
  onToggleActive,
  onDelete,
  onRetry,
}: {
  rules: ReminderRule[]
  isLoading?: boolean
  isError?: boolean
  busyId?: string | null
  onNew: () => void
  onEdit: (rule: ReminderRule) => void
  onToggleActive: (rule: ReminderRule) => void
  onDelete: (rule: ReminderRule) => void
  onRetry: () => void
}) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-normal text-foreground">Lembretes configurados</h2>
          <p className="mt-1 text-sm text-muted-foreground">Crie avisos simples para compromissos financeiros importantes.</p>
        </div>
        <Button type="button" onClick={onNew} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Novo lembrete
        </Button>
      </div>

      <div className="space-y-3 p-4">
        {isLoading && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" />
            Carregando lembretes...
          </div>
        )}

        {isError && (
          <div className="space-y-3 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <p>Não foi possível carregar os lembretes.</p>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Tentar novamente
            </Button>
          </div>
        )}

        {!isLoading && !isError && rules.length === 0 && (
          <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            Nenhum lembrete configurado ainda.
          </div>
        )}

        {!isLoading &&
          !isError &&
          rules.map((rule) => (
            <ReminderRuleCard
              key={rule.id}
              rule={rule}
              isBusy={busyId === rule.id}
              onEdit={onEdit}
              onToggleActive={onToggleActive}
              onDelete={onDelete}
            />
          ))}
      </div>
    </section>
  )
}
