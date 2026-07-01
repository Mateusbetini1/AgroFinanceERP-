import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { cn, formatCurrency } from '@/lib/utils'
import type { CashflowForecast, UnallocatedForecastMonth } from '../types'

function monthLabel(month: number, year: number) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

export function UnallocatedCommitments({ forecast }: { forecast: CashflowForecast }) {
  const columns: DataTableColumn<UnallocatedForecastMonth>[] = [
    { header: 'Mês', cell: (month) => monthLabel(month.month, month.year) },
    { header: 'Receitas sem conta', cell: (month) => formatCurrency(month.receivables) },
    { header: 'Despesas sem conta', cell: (month) => formatCurrency(month.expenses) },
    { header: 'Boletos sem conta', cell: (month) => formatCurrency(month.bills) },
    { header: 'Folha sem conta', cell: (month) => formatCurrency(month.payroll) },
    { header: 'Líquido não alocado', cell: (month) => formatCurrency(month.net) },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Compromissos não alocados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Entradas sem conta</p>
            <p className="font-medium">{formatCurrency(forecast.unallocated.totalInflows)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Saídas sem conta</p>
            <p className="font-medium">{formatCurrency(forecast.unallocated.totalOutflows)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Líquido não alocado</p>
            <p className="font-medium">
              {formatCurrency(forecast.unallocated.totalInflows - forecast.unallocated.totalOutflows)}
            </p>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={forecast.unallocated.months}
          getRowKey={(month) => `${month.year}-${month.month}`}
          mobileCard={(month) => (
            <div className={cn('space-y-4 rounded-lg border p-3', month.net < 0 ? 'border-amber-200 bg-amber-50/60' : 'bg-card')}>
              <div>
                <p className="text-sm font-semibold text-foreground">{monthLabel(month.month, month.year)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Valores sem conta definida</p>
              </div>

              <div className="rounded-md border bg-background/70 p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Líquido não alocado</p>
                <p className={cn('mt-1 text-lg font-semibold', month.net < 0 ? 'text-rose-700' : 'text-emerald-700')}>
                  {formatCurrency(month.net)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Receitas</p>
                  <p className="mt-1 font-medium text-emerald-700">{formatCurrency(month.receivables)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Despesas</p>
                  <p className="mt-1 font-medium text-rose-700">{formatCurrency(month.expenses)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Boletos</p>
                  <p className="mt-1 font-medium text-rose-700">{formatCurrency(month.bills)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Folha</p>
                  <p className="mt-1 font-medium text-rose-700">{formatCurrency(month.payroll)}</p>
                </div>
              </div>
            </div>
          )}
        />
      </CardContent>
    </Card>
  )
}
