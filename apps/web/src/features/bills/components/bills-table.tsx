import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { RowActions } from '@/components/data/row-actions'
import { formatCurrency, formatDate, formatStatusLabel } from '@/lib/utils'
import type { Bill } from '@/types/api'

function formatInstallment(bill: Bill) {
  if (!bill.installmentNumber && !bill.installmentCount) return '-'
  return `${bill.installmentNumber ?? '-'} / ${bill.installmentCount ?? '-'}`
}

export function BillsTable({
  bills,
  deletingId,
  onEdit,
  onDelete,
}: {
  bills: Bill[]
  deletingId?: string | null
  onEdit: (bill: Bill) => void
  onDelete: (bill: Bill) => void
}) {
  const columns: DataTableColumn<Bill>[] = [
    { header: 'Descrição', cell: (bill) => <span className="font-medium">{bill.description}</span> },
    { header: 'Fornecedor', cell: (bill) => bill.supplier?.name ?? '-' },
    { header: 'Conta', cell: (bill) => bill.account?.name ?? '-' },
    { header: 'Valor', cell: (bill) => formatCurrency(bill.amount), className: 'text-right' },
    { header: 'Vencimento', cell: (bill) => formatDate(bill.dueDate) },
    { header: 'Pagamento', cell: (bill) => formatDate(bill.paidAt) },
    { header: 'Parcela', cell: formatInstallment },
    {
      header: 'Status',
      cell: (bill) => (
        <Badge variant={bill.status === 'PAID' ? 'success' : bill.status === 'OVERDUE' ? 'destructive' : 'warning'}>
          {formatStatusLabel(bill.status)}
        </Badge>
      ),
    },
    {
      header: '',
      className: 'text-right',
      cell: (bill) => (
        <RowActions
          onEdit={() => onEdit(bill)}
          onDelete={() => onDelete(bill)}
          isDeleting={deletingId === bill.id}
        />
      ),
    },
  ]

  return <DataTable columns={columns} data={bills} getRowKey={(bill) => bill.id} />
}
