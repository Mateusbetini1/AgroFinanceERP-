import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { formatCurrency, formatDate, formatStatusLabel } from '@/lib/utils'
import type { Expense } from '@/types/api'

const columns: DataTableColumn<Expense>[] = [
  { header: 'Descrição', cell: (expense) => <span className="font-medium">{expense.description}</span> },
  { header: 'Categoria', cell: (expense) => expense.category.name },
  { header: 'Fornecedor', cell: (expense) => expense.supplier?.name ?? '-' },
  { header: 'Valor', cell: (expense) => formatCurrency(expense.amount), className: 'text-right' },
  {
    header: 'Status',
    cell: (expense) => (
      <Badge
        variant={
          expense.status === 'PAID' ? 'success' : expense.status === 'OVERDUE' ? 'destructive' : 'warning'
        }
      >
        {formatStatusLabel(expense.status)}
      </Badge>
    ),
  },
  {
    header: 'Data / vencimento',
    cell: (expense) => `${formatDate(expense.date)} / ${formatDate(expense.dueDate)}`,
  },
]

export function ExpensesTable({ expenses }: { expenses: Expense[] }) {
  return <DataTable columns={columns} data={expenses} getRowKey={(expense) => expense.id} />
}
