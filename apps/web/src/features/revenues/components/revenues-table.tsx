import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { RowActions } from '@/components/data/row-actions'
import { formatCurrency, formatDate, formatDecimal, formatStatusLabel } from '@/lib/utils'
import type { Revenue } from '@/types/api'

export function RevenuesTable({
  revenues,
  deletingId,
  onEdit,
  onDelete,
}: {
  revenues: Revenue[]
  deletingId?: string | null
  onEdit: (revenue: Revenue) => void
  onDelete: (revenue: Revenue) => void
}) {
  const columns: DataTableColumn<Revenue>[] = [
    { header: 'Produto', cell: (revenue) => <span className="font-medium">{revenue.product.name}</span> },
    { header: 'Cliente', cell: (revenue) => revenue.client ?? '-' },
    { header: 'Quantidade', cell: (revenue) => formatDecimal(revenue.quantity, 2), className: 'text-right' },
    { header: 'Valor total', cell: (revenue) => formatCurrency(revenue.totalAmount), className: 'text-right' },
    {
      header: 'Status',
      cell: (revenue) => (
        <Badge variant={revenue.status === 'RECEIVED' ? 'success' : 'warning'}>
          {formatStatusLabel(revenue.status)}
        </Badge>
      ),
    },
    { header: 'Conta', cell: (revenue) => revenue.account?.name ?? '-' },
    { header: 'Data', cell: (revenue) => formatDate(revenue.date) },
    { header: 'Prev./Recebimento', cell: (revenue) => formatDate(revenue.receivedAt) },
    {
      header: '',
      className: 'text-right',
      cell: (revenue) => (
        <RowActions
          onEdit={() => onEdit(revenue)}
          onDelete={() => onDelete(revenue)}
          isDeleting={deletingId === revenue.id}
        />
      ),
    },
  ]

  return <DataTable columns={columns} data={revenues} getRowKey={(revenue) => revenue.id} />
}
