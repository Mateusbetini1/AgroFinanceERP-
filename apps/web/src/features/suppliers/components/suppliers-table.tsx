import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { RowActions } from '@/components/data/row-actions'
import type { Supplier } from '@/types/api'

export function SuppliersTable({
  suppliers,
  deletingId,
  onEdit,
  onDelete,
}: {
  suppliers: Supplier[]
  deletingId?: string | null
  onEdit: (supplier: Supplier) => void
  onDelete: (supplier: Supplier) => void
}) {
  const columns: DataTableColumn<Supplier>[] = [
    { header: 'Nome', cell: (supplier) => <span className="font-medium">{supplier.name}</span> },
    { header: 'Documento', cell: (supplier) => supplier.document },
    { header: 'Telefone', cell: (supplier) => supplier.phone ?? '-' },
    { header: 'Email', cell: (supplier) => supplier.email ?? '-' },
    { header: 'Observações', cell: (supplier) => supplier.notes ?? '-' },
    {
      header: '',
      className: 'text-right',
      cell: (supplier) => (
        <RowActions
          onEdit={() => onEdit(supplier)}
          onDelete={() => onDelete(supplier)}
          isDeleting={deletingId === supplier.id}
        />
      ),
    },
  ]

  return <DataTable columns={columns} data={suppliers} getRowKey={(supplier) => supplier.id} />
}
