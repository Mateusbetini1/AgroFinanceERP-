import { Badge, type BadgeProps } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { RowActions } from '@/components/data/row-actions'
import { formatDate, formatDecimal, formatSafraStatus, formatStatusLabel, formatUnit } from '@/lib/utils'
import type { Safra, SafraStatus } from '@/types/api'

const statusVariants: Record<SafraStatus, BadgeProps['variant']> = {
  PLANNED: 'warning',
  ACTIVE: 'success',
  COMPLETED: 'default',
  CANCELLED: 'muted',
}

export function SafrasTable({
  safras,
  deletingId,
  onEdit,
  onDelete,
}: {
  safras: Safra[]
  deletingId?: string | null
  onEdit: (safra: Safra) => void
  onDelete: (safra: Safra) => void
}) {
  const columns: DataTableColumn<Safra>[] = [
    { header: 'Nome', cell: (safra) => <span className="font-medium">{safra.name}</span> },
    { header: 'Produto', cell: (safra) => safra.product?.name ?? '-' },
    { header: 'Local', cell: (safra) => safra.farmLocation?.name ?? '-' },
    {
      header: 'Status',
      cell: (safra) => <Badge variant={statusVariants[safra.status]}>{formatSafraStatus(safra.status)}</Badge>,
    },
    { header: 'Inicio', cell: (safra) => formatDate(safra.startDate) },
    { header: 'Fim', cell: (safra) => formatDate(safra.endDate) },
    {
      header: 'Producao estimada',
      cell: (safra) => {
        if (safra.estimatedYield === null || safra.estimatedYield === undefined) return '-'
        const unit = safra.product?.unit ? ` ${formatUnit(safra.product.unit)}` : ''
        return `${formatDecimal(safra.estimatedYield, 3)}${unit}`
      },
    },
    {
      header: 'Ativa',
      cell: (safra) => (
        <Badge variant={safra.active ? 'success' : 'muted'}>
          {formatStatusLabel(safra.active ? 'ACTIVE' : 'INACTIVE')}
        </Badge>
      ),
    },
    {
      header: '',
      className: 'text-right',
      cell: (safra) => (
        <RowActions
          onEdit={() => onEdit(safra)}
          onDelete={() => onDelete(safra)}
          isDeleting={deletingId === safra.id}
        />
      ),
    },
  ]

  return <DataTable columns={columns} data={safras} getRowKey={(safra) => safra.id} />
}
