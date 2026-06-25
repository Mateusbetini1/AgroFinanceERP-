import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { formatCurrency, formatDate, formatStatusLabel } from '@/lib/utils'
import type { Bill } from '@/types/api'

const columns: DataTableColumn<Bill>[] = [
  { header: 'Descrição', cell: (bill) => <span className="font-medium">{bill.description}</span> },
  { header: 'Fornecedor', cell: (bill) => bill.supplier?.name ?? '-' },
  { header: 'Valor', cell: (bill) => formatCurrency(bill.amount), className: 'text-right' },
  { header: 'Vencimento', cell: (bill) => formatDate(bill.dueDate) },
  {
    header: 'Status',
    cell: (bill) => (
      <Badge variant={bill.status === 'PAID' ? 'success' : bill.status === 'OVERDUE' ? 'destructive' : 'warning'}>
        {formatStatusLabel(bill.status)}
      </Badge>
    ),
  },
  { header: 'Conta', cell: (bill) => bill.account?.name ?? '-' },
]

export function BillsTable({ bills }: { bills: Bill[] }) {
  return <DataTable columns={columns} data={bills} getRowKey={(bill) => bill.id} />
}
