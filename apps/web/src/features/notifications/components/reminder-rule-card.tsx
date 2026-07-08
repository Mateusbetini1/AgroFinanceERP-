'use client'

import { Bell, BellOff, CalendarDays, Edit, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import type { ReminderRule, ReminderRuleType } from '../reminder-api'

const typeLabels: Record<ReminderRuleType, string> = {
  BILL: 'Boleto',
  EXPENSE: 'Despesa',
  REVENUE: 'Receita',
  GENERAL: 'Geral',
}

function leadDaysLabel(days: number[]) {
  const ordered = [7, 2, 1, 0].filter((day) => days.includes(day))
  return ordered
    .map((day) => {
      if (day === 0) return 'no dia'
      if (day === 1) return '1 dia antes'
      return `${day} dias antes`
    })
    .join(', ')
}

function recurrenceLabel(rule: ReminderRule) {
  if (rule.recurrenceType === 'MONTHLY_DAY') return `Todo dia ${rule.dayOfMonth}`
  return rule.dueDate ? formatDate(rule.dueDate) : 'Data unica'
}

export function ReminderRuleCard({
  rule,
  onEdit,
  onToggleActive,
  onDelete,
  isBusy,
}: {
  rule: ReminderRule
  onEdit: (rule: ReminderRule) => void
  onToggleActive: (rule: ReminderRule) => void
  onDelete: (rule: ReminderRule) => void
  isBusy?: boolean
}) {
  return (
    <article className="rounded-md border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{rule.name}</h3>
            <Badge variant="outline">{typeLabels[rule.type]}</Badge>
            <Badge variant={rule.active ? 'default' : 'secondary'}>{rule.active ? 'Ativo' : 'Inativo'}</Badge>
          </div>

          <div className="grid gap-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {recurrenceLabel(rule)}
            </span>
            <span>Avisar: {leadDaysLabel(rule.leadDays)}</span>
            <span>{rule.pushEnabled ? 'Push ativo' : 'Push inativo'} · {rule.inAppEnabled ? 'No app' : 'Fora do app'}</span>
          </div>

          {rule.notes && <p className="text-sm text-muted-foreground">{rule.notes}</p>}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={() => onEdit(rule)}>
            <Edit className="h-4 w-4" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={() => onToggleActive(rule)}>
            {rule.active ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            <span className="hidden sm:inline">{rule.active ? 'Desativar' : 'Ativar'}</span>
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={() => onDelete(rule)}>
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Excluir</span>
          </Button>
        </div>
      </div>
    </article>
  )
}
