import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { BillGroupStatus, BillGroupSummary } from '../types'

export function formatBillGroupStatus(status: BillGroupStatus): string {
  const labels: Record<BillGroupStatus, string> = {
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em andamento',
    PAID: 'Pago',
    OVERDUE: 'Vencido',
  }

  return labels[status]
}

function statusVariant(status: BillGroupStatus) {
  if (status === 'PAID') return 'success'
  if (status === 'OVERDUE') return 'destructive'
  if (status === 'IN_PROGRESS') return 'warning'
  return 'secondary'
}

function InstallmentProgress({ group }: { group: BillGroupSummary }) {
  return (
    <span>
      {group.paidInstallments} paga{group.paidInstallments === 1 ? '' : 's'} /{' '}
      {group.pendingInstallments + group.overdueInstallments} pendente
      {group.pendingInstallments + group.overdueInstallments === 1 ? '' : 's'}
    </span>
  )
}

export function BillGroupsTable({
  groups,
  selectedId,
  onSelect,
}: {
  groups: BillGroupSummary[]
  selectedId?: string | null
  onSelect: (group: BillGroupSummary) => void
}) {
  const columns: DataTableColumn<BillGroupSummary>[] = [
    {
      header: 'Descricao',
      cell: (group) => (
        <div>
          <p className="font-medium">{group.description}</p>
          <p className="text-xs text-muted-foreground">
            {group.categoryMixed ? 'Categoria mista' : group.category?.name ?? 'Sem categoria'} |{' '}
            {group.safraMixed ? 'Safra mista' : group.safra?.name ?? 'Sem safra'}
          </p>
        </div>
      ),
    },
    { header: 'Fornecedor', cell: (group) => group.supplier?.name ?? '-' },
    { header: 'Total original', cell: (group) => formatCurrency(group.totalAmount), className: 'text-right' },
    { header: 'Pago', cell: (group) => formatCurrency(group.paidAmount), className: 'text-right' },
    { header: 'Pendente', cell: (group) => formatCurrency(group.pendingAmount), className: 'text-right' },
    { header: 'Parcelas', cell: (group) => <InstallmentProgress group={group} /> },
    { header: 'Proximo venc.', cell: (group) => formatDate(group.nextDueDate) },
    {
      header: 'Status',
      cell: (group) => <Badge variant={statusVariant(group.status)}>{formatBillGroupStatus(group.status)}</Badge>,
    },
    {
      header: '',
      className: 'text-right',
      cell: (group) => (
        <Button type="button" variant={selectedId === group.id ? 'secondary' : 'outline'} size="sm" onClick={() => onSelect(group)}>
          Detalhar
        </Button>
      ),
    },
  ]

  return <DataTable columns={columns} data={groups} getRowKey={(group) => group.id} />
}
