import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { RowActions } from '@/components/data/row-actions'
import { formatCurrency, formatDate, formatEmployeeType, formatStatusLabel } from '@/lib/utils'
import type { Employee } from '@/types/api'

export function EmployeesTable({
  employees,
  deletingId,
  onEdit,
  onDelete,
}: {
  employees: Employee[]
  deletingId?: string | null
  onEdit: (employee: Employee) => void
  onDelete: (employee: Employee) => void
}) {
  const columns: DataTableColumn<Employee>[] = [
    { header: 'Nome', cell: (employee) => <span className="font-medium">{employee.name}</span> },
    { header: 'Cargo', cell: (employee) => employee.role },
    { header: 'Tipo', cell: (employee) => formatEmployeeType(employee.type) },
    { header: 'Salário base', cell: (employee) => formatCurrency(employee.baseSalary), className: 'text-right' },
    {
      header: 'Status',
      cell: (employee) => (
        <Badge variant={employee.status === 'ACTIVE' ? 'success' : 'muted'}>
          {formatStatusLabel(employee.status)}
        </Badge>
      ),
    },
    { header: 'Admissão', cell: (employee) => formatDate(employee.hireDate) },
    { header: 'Telefone', cell: (employee) => employee.phone ?? '-' },
    {
      header: '',
      className: 'text-right',
      cell: (employee) => (
        <RowActions
          onEdit={() => onEdit(employee)}
          onDelete={() => onDelete(employee)}
          isDeleting={deletingId === employee.id}
        />
      ),
    },
  ]

  return <DataTable columns={columns} data={employees} getRowKey={(employee) => employee.id} />
}
