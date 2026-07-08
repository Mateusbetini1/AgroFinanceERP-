'use client'

import { CalendarClock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { formatDate } from '@/lib/utils'
import type { ReminderPreviewItem, ReminderRuleType } from '../reminder-api'

const typeLabels: Record<ReminderRuleType, string> = {
  BILL: 'Boleto',
  EXPENSE: 'Despesa',
  REVENUE: 'Receita',
  GENERAL: 'Geral',
}

export function ReminderPreview({
  items,
  isLoading,
  isError,
}: {
  items: ReminderPreviewItem[]
  isLoading?: boolean
  isError?: boolean
}) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-base tracking-normal">
          <CalendarClock className="h-4 w-4" />
          Próximos lembretes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-2">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" />
            Calculando previsões...
          </div>
        )}

        {isError && <p className="text-sm text-destructive">Não foi possível carregar a prévia.</p>}

        {!isLoading && !isError && items.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum lembrete previsto no momento.</p>
        )}

        {!isLoading &&
          !isError &&
          items.slice(0, 6).map((item) => (
            <div key={`${item.ruleId}-${item.scheduledFor}-${item.leadDays}`} className="rounded-md border p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{item.ruleName}</p>
                  <p className="text-xs text-muted-foreground">
                    {typeLabels[item.type]} · vencimento {formatDate(item.dueDate)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-medium text-foreground">{formatDate(item.scheduledFor)}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  )
}
