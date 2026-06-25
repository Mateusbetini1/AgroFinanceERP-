import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { formatCurrency, formatDate, formatDecimal, formatStatusLabel } from '@/lib/utils'
import type { Revenue } from '@/types/api'

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
  { header: 'Data', cell: (revenue) => formatDate(revenue.date) },
]

export function RevenuesTable({ revenues }: { revenues: Revenue[] }) {
  return <DataTable columns={columns} data={revenues} getRowKey={(revenue) => revenue.id} />
}
