import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { cn, formatCurrency } from '@/lib/utils'
import type { ForecastAlertLevel, ForecastMonth } from '../types'

function monthLabel(month: number, year: number) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

function alertLabel(alert: ForecastAlertLevel) {
  if (alert === 'NEGATIVE') return 'Negativo'
  if (alert === 'WARNING') return 'Atenção'
  return 'OK'
}

function alertVariant(alert: ForecastAlertLevel) {
  if (alert === 'NEGATIVE') return 'destructive'
  if (alert === 'WARNING') return 'warning'
  return 'success'
}

function cardTone(alert: ForecastAlertLevel) {
  if (alert === 'NEGATIVE') return 'border-rose-200 bg-rose-50/70'
  if (alert === 'WARNING') return 'border-amber-200 bg-amber-50/60'
  return 'border-border bg-card'
}

export function ForecastTable({ months }: { months: ForecastMonth[] }) {
  const columns: DataTableColumn<ForecastMonth>[] = [
    { header: 'Mês', cell: (month) => monthLabel(month.month, month.year) },
    { header: 'Saldo inicial projetado', cell: (month) => formatCurrency(month.startingBalance) },
    { header: 'Receitas previstas', cell: (month) => formatCurrency(month.projectedReceivables) },
    { header: 'Despesas previstas', cell: (month) => formatCurrency(month.projectedExpenses) },
    { header: 'Boletos/parcelas previstas', cell: (month) => formatCurrency(month.projectedBills) },
    { header: 'Folha prevista', cell: (month) => formatCurrency(month.projectedPayroll) },
    { header: 'Saldo final projetado', cell: (month) => formatCurrency(month.endingBalance) },
    {
      header: 'Alerta',
      cell: (month) => <Badge variant={alertVariant(month.alert)}>{alertLabel(month.alert)}</Badge>,
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={months}
      getRowKey={(month) => `${month.year}-${month.month}`}
      mobileCard={(month) => (
        <div className={cn('space-y-4 rounded-lg border p-3', cardTone(month.alert))}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{monthLabel(month.month, month.year)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Projeção mensal total</p>
            </div>
            <Badge variant={alertVariant(month.alert)}>{alertLabel(month.alert)}</Badge>
          </div>

          <div className="rounded-md border bg-background/70 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Saldo final projetado</p>
            <p className={cn('mt-1 text-xl font-semibold tracking-normal', month.endingBalance < 0 && 'text-rose-700')}>
              {formatCurrency(month.endingBalance)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Saldo inicial</p>
              <p className="mt-1 font-medium">{formatCurrency(month.startingBalance)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Entradas</p>
              <p className="mt-1 font-medium text-emerald-700">{formatCurrency(month.projectedReceivables)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Despesas</p>
              <p className="mt-1 font-medium text-rose-700">{formatCurrency(month.projectedExpenses)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Boletos</p>
              <p className="mt-1 font-medium text-rose-700">{formatCurrency(month.projectedBills)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Folha</p>
              <p className="mt-1 font-medium text-rose-700">{formatCurrency(month.projectedPayroll)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Líquido</p>
              <p className={cn('mt-1 font-medium', month.projectedNet >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                {formatCurrency(month.projectedNet)}
              </p>
            </div>
          </div>
        </div>
      )}
    />
  )
}
