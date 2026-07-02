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

  return (
    <DataTable
      columns={columns}
      data={employees}
      getRowKey={(employee) => employee.id}
      mobileCard={(employee) => (
        <div className="space-y-3 rounded-lg border bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-foreground">{employee.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {employee.role} · {formatEmployeeType(employee.type)}
              </p>
            </div>
            <Badge variant={employee.status === 'ACTIVE' ? 'success' : 'muted'}>
              {formatStatusLabel(employee.status)}
            </Badge>
          </div>

          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Salário base</p>
            <p className="mt-1 text-lg font-semibold tracking-normal">{formatCurrency(employee.baseSalary)}</p>
          </div>

          <RowActions
            onEdit={() => onEdit(employee)}
            onDelete={() => onDelete(employee)}
            isDeleting={deletingId === employee.id}
          />
        </div>
      )}
    />
  )
}
