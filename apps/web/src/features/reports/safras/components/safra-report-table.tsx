import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { cn, formatCurrency, formatDate, formatDecimal, formatSafraStatus, formatUnit } from '@/lib/utils'
import type { SafraReportSummary } from '../types'

function statusVariant(status: SafraReportSummary['status']) {
  if (status === 'ACTIVE') return 'success'
  if (status === 'CANCELLED') return 'destructive'
  if (status === 'COMPLETED') return 'secondary'
  return 'muted'
}

function resultTone(result: number) {
  return result < 0 ? 'border-rose-200 bg-rose-50/70' : 'border-emerald-200 bg-emerald-50/40'
}

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
      cell: (item) => <Badge variant={statusVariant(item.status)}>{formatSafraStatus(item.status)}</Badge>,
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

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowKey={(item) => item.safraId}
      mobileCard={(item) => (
        <div className={cn('space-y-4 rounded-lg border p-3', resultTone(item.projectedResult))}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-foreground">{item.safraName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.product.name} {item.farmLocation?.name ? `| ${item.farmLocation.name}` : ''}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(item.startDate)} - {formatDate(item.endDate)}
              </p>
            </div>
            <Badge variant={statusVariant(item.status)} className="shrink-0">
              {formatSafraStatus(item.status)}
            </Badge>
          </div>

          <div className="rounded-md border bg-background/70 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Resultado previsto</p>
            <p className={cn('mt-1 text-xl font-semibold tracking-normal', item.projectedResult < 0 ? 'text-rose-700' : 'text-emerald-700')}>
              {formatCurrency(item.projectedResult)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Realizado: {formatCurrency(item.realizedResult)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border bg-background/70 p-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">Receitas</p>
              <p className="mt-1 text-sm font-semibold text-emerald-700">{formatCurrency(item.totalRevenue)}</p>
            </div>
            <div className="rounded-md border bg-background/70 p-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">Custos</p>
              <p className="mt-1 text-sm font-semibold text-rose-700">{formatCurrency(item.totalCosts)}</p>
            </div>
            <div className="rounded-md border bg-background/70 p-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">Custo/unidade</p>
              <p className="mt-1 text-sm font-semibold">
                {item.costPerEstimatedUnit === null ? '-' : formatCurrency(item.costPerEstimatedUnit)}
              </p>
            </div>
            <div className="rounded-md border bg-background/70 p-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">Produção</p>
              <p className="mt-1 text-sm font-semibold">
                {item.estimatedYield === null
                  ? '-'
                  : `${formatDecimal(item.estimatedYield, 3)} ${formatUnit(item.product.unit)}`}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant={selectedId === item.safraId ? 'secondary' : 'outline'}
            className="h-11 w-full"
            onClick={() => onSelect(item)}
          >
            <Eye className="h-4 w-4" />
            Detalhar
          </Button>
        </div>
      )}
    />
  )
}
