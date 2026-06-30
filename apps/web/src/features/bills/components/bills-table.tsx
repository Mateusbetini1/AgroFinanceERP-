import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { RowActions } from '@/components/data/row-actions'
import { formatCurrency, formatDate, formatStatusLabel } from '@/lib/utils'
import type { Bill } from '@/types/api'

function InstallmentBadge({ bill }: { bill: Bill }) {
  if (!bill.installmentNumber || !bill.installmentCount) return <span>-</span>

  return (
    <Badge variant="secondary">
      {bill.installmentNumber}/{bill.installmentCount}
    </Badge>
  )
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
    {
      header: 'Descricao',
      cell: (bill) => (
        <div>
          <p className="font-medium">{bill.description}</p>
          <p className="text-xs text-muted-foreground">
            {bill.category?.name ?? 'Sem categoria'} | {bill.safra?.name ?? 'Sem safra'}
          </p>
        </div>
      ),
    },
    { header: 'Fornecedor', cell: (bill) => bill.supplier?.name ?? '-' },
    { header: 'Conta', cell: (bill) => bill.account?.name ?? '-' },
    { header: 'Valor', cell: (bill) => formatCurrency(bill.amount), className: 'text-right' },
    { header: 'Vencimento', cell: (bill) => formatDate(bill.dueDate) },
    { header: 'Pagamento', cell: (bill) => formatDate(bill.paidAt) },
    { header: 'Parcela', cell: (bill) => <InstallmentBadge bill={bill} /> },
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
