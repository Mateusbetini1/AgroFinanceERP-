import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { RowActions } from '@/components/data/row-actions'
import { formatCurrency, formatDate, formatPaymentType } from '@/lib/utils'
import type { EmployeePayment } from '@/types/api'

export function EmployeePaymentsTable({
  payments,
  deletingId,
  onEdit,
  onDelete,
}: {
  payments: EmployeePayment[]
  deletingId?: string | null
  onEdit: (payment: EmployeePayment) => void
  onDelete: (payment: EmployeePayment) => void
}) {
  const columns: DataTableColumn<EmployeePayment>[] = [
    { header: 'Funcionário', cell: (payment) => <span className="font-medium">{payment.employee.name}</span> },
    { header: 'Tipo', cell: (payment) => formatPaymentType(payment.type) },
    { header: 'Valor', cell: (payment) => formatCurrency(payment.amount), className: 'text-right' },
    { header: 'Data', cell: (payment) => formatDate(payment.date) },
    { header: 'Referência', cell: (payment) => `${String(payment.referenceMonth).padStart(2, '0')}/${payment.referenceYear}` },
    { header: 'Conta', cell: (payment) => payment.account?.name ?? '-' },
    { header: 'Observações', cell: (payment) => payment.notes ?? '-' },
    {
      header: '',
      className: 'text-right',
      cell: (payment) => (
        <RowActions
          onEdit={() => onEdit(payment)}
          onDelete={() => onDelete(payment)}
          isDeleting={deletingId === payment.id}
        />
      ),
    },
  ]

  return <DataTable columns={columns} data={payments} getRowKey={(payment) => payment.id} />
}
