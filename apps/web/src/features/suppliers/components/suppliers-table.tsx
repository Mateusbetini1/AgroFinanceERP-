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
    { header: 'Documento', cell: (supplier) => supplier.document || '-' },
    { header: 'Telefone', cell: (supplier) => supplier.phone ?? '-' },
    { header: 'Email', cell: (supplier) => supplier.email ?? '-' },
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

  return (
    <DataTable
      columns={columns}
      data={suppliers}
      getRowKey={(supplier) => supplier.id}
      mobileCard={(supplier) => (
        <div className="space-y-3 rounded-lg border bg-card p-3">
          <div>
            <p className="break-words text-sm font-semibold text-foreground">{supplier.name}</p>
            {supplier.document && <p className="mt-1 text-xs text-muted-foreground">{supplier.document}</p>}
          </div>

          {(supplier.phone || supplier.email) && (
            <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-sm">
              {supplier.phone && <p>{supplier.phone}</p>}
              {supplier.email && <p className="break-words text-muted-foreground">{supplier.email}</p>}
            </div>
          )}

          <RowActions
            onEdit={() => onEdit(supplier)}
            onDelete={() => onDelete(supplier)}
            isDeleting={deletingId === supplier.id}
          />
        </div>
      )}
    />
  )
}
