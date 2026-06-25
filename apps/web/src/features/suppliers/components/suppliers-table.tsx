import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import type { Supplier } from '@/types/api'

const columns: DataTableColumn<Supplier>[] = [
  { header: 'Nome', cell: (supplier) => <span className="font-medium">{supplier.name}</span> },
  { header: 'Documento', cell: (supplier) => supplier.document },
  { header: 'Telefone', cell: (supplier) => supplier.phone ?? '-' },
  { header: 'Email', cell: (supplier) => supplier.email ?? '-' },
  { header: 'Observações', cell: (supplier) => supplier.notes ?? '-' },
]

export function SuppliersTable({ suppliers }: { suppliers: Supplier[] }) {
  return <DataTable columns={columns} data={suppliers} getRowKey={(supplier) => supplier.id} />
}
