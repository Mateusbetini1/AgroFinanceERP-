import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { formatCurrency } from '@/lib/utils'
import type { CashflowForecast, UnallocatedForecastMonth } from '../types'

function monthLabel(month: number, year: number) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

export function UnallocatedCommitments({ forecast }: { forecast: CashflowForecast }) {
  const columns: DataTableColumn<UnallocatedForecastMonth>[] = [
    { header: 'Mes', cell: (month) => monthLabel(month.month, month.year) },
    { header: 'Receitas sem conta', cell: (month) => formatCurrency(month.receivables) },
    { header: 'Despesas sem conta', cell: (month) => formatCurrency(month.expenses) },
    { header: 'Boletos sem conta', cell: (month) => formatCurrency(month.bills) },
    { header: 'Folha sem conta', cell: (month) => formatCurrency(month.payroll) },
    { header: 'Liquido nao alocado', cell: (month) => formatCurrency(month.net) },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Compromissos nao alocados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Entradas sem conta</p>
            <p className="font-medium">{formatCurrency(forecast.unallocated.totalInflows)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Saidas sem conta</p>
            <p className="font-medium">{formatCurrency(forecast.unallocated.totalOutflows)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Liquido nao alocado</p>
            <p className="font-medium">
              {formatCurrency(forecast.unallocated.totalInflows - forecast.unallocated.totalOutflows)}
            </p>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={forecast.unallocated.months}
          getRowKey={(month) => `${month.year}-${month.month}`}
        />
      </CardContent>
    </Card>
  )
}
