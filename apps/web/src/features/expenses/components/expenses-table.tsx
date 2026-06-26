import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { RowActions } from '@/components/data/row-actions'
import { formatCurrency, formatDate, formatStatusLabel } from '@/lib/utils'
import type { Expense } from '@/types/api'

export function ExpensesTable({
  expenses,
  deletingId,
  onEdit,
  onDelete,
}: {
  expenses: Expense[]
  deletingId?: string | null
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}) {
  const columns: DataTableColumn<Expense>[] = [
    { header: 'Descrição', cell: (expense) => <span className="font-medium">{expense.description}</span> },
    { header: 'Categoria', cell: (expense) => expense.category.name },
    { header: 'Fornecedor', cell: (expense) => expense.supplier?.name ?? '-' },
    { header: 'Conta', cell: (expense) => expense.account?.name ?? '-' },
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
    { header: 'Pagamento', cell: (expense) => formatDate(expense.paidAt) },
    {
      header: '',
      className: 'text-right',
      cell: (expense) => (
        <RowActions
          onEdit={() => onEdit(expense)}
          onDelete={() => onDelete(expense)}
          isDeleting={deletingId === expense.id}
        />
      ),
    },
  ]

  return <DataTable columns={columns} data={expenses} getRowKey={(expense) => expense.id} />
}
