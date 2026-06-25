import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { formatAccountType, formatCurrency, formatStatusLabel } from '@/lib/utils'
import type { Account } from '@/types/api'

const columns: DataTableColumn<Account>[] = [
  { header: 'Nome', cell: (account) => <span className="font-medium">{account.name}</span> },
  { header: 'Tipo', cell: (account) => formatAccountType(account.type) },
  { header: 'Saldo atual', cell: (account) => formatCurrency(account.currentBalance), className: 'text-right' },
  { header: 'Saldo inicial', cell: (account) => formatCurrency(account.initialBalance), className: 'text-right' },
  {
    header: 'Status',
    cell: (account) => (
      <Badge variant={account.active ? 'success' : 'muted'}>{formatStatusLabel(account.active ? 'ACTIVE' : 'INACTIVE')}</Badge>
    ),
  },
]

export function AccountsTable({ accounts }: { accounts: Account[] }) {
  return <DataTable columns={columns} data={accounts} getRowKey={(account) => account.id} />
}
