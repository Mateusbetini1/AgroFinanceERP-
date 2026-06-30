import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { formatCurrency, formatDate, formatDecimal, formatSafraStatus, formatUnit } from '@/lib/utils'
import type { SafraReportSummary } from '../types'

export function SafraReportTable({
  items,
  selectedId,
  onSelect,
}: {
  items: SafraReportSummary[]
  selectedId?: string | null
  onSelect: (item: SafraReportSummary) => void
}) {
  const columns: DataTableColumn<SafraReportSummary>[] = [
    {
      header: 'Safra',
      cell: (item) => (
        <div>
          <p className="font-medium">{item.safraName}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(item.startDate)} - {formatDate(item.endDate)}
          </p>
        </div>
      ),
    },
    { header: 'Produto', cell: (item) => item.product.name },
    { header: 'Local', cell: (item) => item.farmLocation?.name ?? '-' },
    {
      header: 'Status',
      cell: (item) => <Badge variant={item.status === 'ACTIVE' ? 'success' : 'muted'}>{formatSafraStatus(item.status)}</Badge>,
    },
    { header: 'Receitas', cell: (item) => formatCurrency(item.totalRevenue) },
    { header: 'Despesas lançadas', cell: (item) => formatCurrency(item.totalExpenses) },
    { header: 'Boletos/contas', cell: (item) => formatCurrency(item.totalBills) },
    { header: 'Custos totais', cell: (item) => formatCurrency(item.totalCosts) },
    { header: 'Resultado previsto', cell: (item) => formatCurrency(item.projectedResult) },
    { header: 'Resultado realizado', cell: (item) => formatCurrency(item.realizedResult) },
    {
      header: 'Produção estimada',
      cell: (item) =>
        item.estimatedYield === null
          ? '-'
          : `${formatDecimal(item.estimatedYield, 3)} ${formatUnit(item.product.unit)}`,
    },
    {
      header: 'Custo por unidade',
      cell: (item) => (item.costPerEstimatedUnit === null ? '-' : formatCurrency(item.costPerEstimatedUnit)),
    },
    {
      header: '',
      className: 'text-right',
      cell: (item) => (
        <Button type="button" variant={selectedId === item.safraId ? 'secondary' : 'outline'} size="sm" onClick={() => onSelect(item)}>
          <Eye className="h-4 w-4" />
          Detalhar
        </Button>
      ),
    },
  ]

  return <DataTable columns={columns} data={items} getRowKey={(item) => item.safraId} />
}
