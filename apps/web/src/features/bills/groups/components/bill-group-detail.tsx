import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/data/data-table'
import { cn, formatCurrency, formatDate, formatStatusLabel } from '@/lib/utils'
import type { BillGroupDetail, BillGroupInstallment } from '../types'
import { BillGroupSummaryCards } from './bill-group-summary'

function statusVariant(status: string) {
  if (status === 'PAID') return 'success'
  if (status === 'OVERDUE') return 'destructive'
  return 'warning'
}

export function BillGroupDetailPanel({ detail }: { detail: BillGroupDetail }) {
  const columns: DataTableColumn<BillGroupInstallment>[] = [
    {
      header: 'Parcela',
      cell: (installment) =>
        installment.installmentNumber && installment.installmentCount
          ? `${installment.installmentNumber}/${installment.installmentCount}`
          : '-',
    },
    { header: 'Descricao', cell: (installment) => installment.description },
    { header: 'Categoria', cell: (installment) => installment.category?.name ?? '-' },
    { header: 'Safra', cell: (installment) => installment.safra?.name ?? '-' },
    { header: 'Fornecedor', cell: (installment) => installment.supplier?.name ?? '-' },
    { header: 'Conta', cell: (installment) => installment.account?.name ?? '-' },
    { header: 'Valor', cell: (installment) => formatCurrency(installment.amount), className: 'text-right' },
    { header: 'Vencimento', cell: (installment) => formatDate(installment.dueDate) },
    { header: 'Pagamento', cell: (installment) => formatDate(installment.paidAt) },
    {
      header: 'Status',
      cell: (installment) => (
        <Badge variant={statusVariant(installment.status)}>{formatStatusLabel(installment.status)}</Badge>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <BillGroupSummaryCards summary={detail.summary} />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Parcelas</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Para editar, pagar ou excluir uma parcela, acesse a tela de boletos.
            </p>
          </div>
          <Link
            href="/bills"
            className={cn(
              'inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium',
              'transition-colors hover:bg-accent hover:text-accent-foreground',
            )}
          >
            Abrir boletos
          </Link>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={detail.installments} getRowKey={(installment) => installment.id} />
        </CardContent>
      </Card>
    </div>
  )
}
