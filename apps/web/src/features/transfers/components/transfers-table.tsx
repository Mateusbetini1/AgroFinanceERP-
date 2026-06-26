import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { RowActions } from '@/components/data/row-actions'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transfer } from '@/types/api'

export function TransfersTable({
  transfers,
  deletingId,
  onEdit,
  onDelete,
}: {
  transfers: Transfer[]
  deletingId?: string | null
  onEdit: (transfer: Transfer) => void
  onDelete: (transfer: Transfer) => void
}) {
  const columns: DataTableColumn<Transfer>[] = [
    { header: 'Origem', cell: (transfer) => <span className="font-medium">{transfer.fromAccount.name}</span> },
    { header: 'Destino', cell: (transfer) => transfer.toAccount.name },
    { header: 'Valor', cell: (transfer) => formatCurrency(transfer.amount), className: 'text-right' },
    { header: 'Data', cell: (transfer) => formatDate(transfer.date) },
    { header: 'Descrição', cell: (transfer) => transfer.description ?? '-' },
    {
      header: '',
      className: 'text-right',
      cell: (transfer) => (
        <RowActions
          onEdit={() => onEdit(transfer)}
          onDelete={() => onDelete(transfer)}
          isDeleting={deletingId === transfer.id}
        />
      ),
    },
  ]

  return <DataTable columns={columns} data={transfers} getRowKey={(transfer) => transfer.id} />
}
