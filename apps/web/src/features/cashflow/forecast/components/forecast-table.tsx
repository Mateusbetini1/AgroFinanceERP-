import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { formatCurrency } from '@/lib/utils'
import type { ForecastAlertLevel, ForecastMonth } from '../types'

function monthLabel(month: number, year: number) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

function alertLabel(alert: ForecastAlertLevel) {
  if (alert === 'NEGATIVE') return 'Negativo'
  if (alert === 'WARNING') return 'Atenção'
  return 'OK'
}

export function ForecastTable({ months }: { months: ForecastMonth[] }) {
  const columns: DataTableColumn<ForecastMonth>[] = [
    { header: 'Mes', cell: (month) => monthLabel(month.month, month.year) },
    { header: 'Saldo inicial projetado', cell: (month) => formatCurrency(month.startingBalance) },
    { header: 'Receitas previstas', cell: (month) => formatCurrency(month.projectedReceivables) },
    { header: 'Despesas previstas', cell: (month) => formatCurrency(month.projectedExpenses) },
    { header: 'Boletos/parcelas previstas', cell: (month) => formatCurrency(month.projectedBills) },
    { header: 'Folha prevista', cell: (month) => formatCurrency(month.projectedPayroll) },
    { header: 'Saldo final projetado', cell: (month) => formatCurrency(month.endingBalance) },
    {
      header: 'Alerta',
      cell: (month) => (
        <Badge variant={month.alert === 'NEGATIVE' ? 'destructive' : month.alert === 'WARNING' ? 'warning' : 'success'}>
          {alertLabel(month.alert)}
        </Badge>
      ),
    },
  ]

  return <DataTable columns={columns} data={months} getRowKey={(month) => `${month.year}-${month.month}`} />
}
