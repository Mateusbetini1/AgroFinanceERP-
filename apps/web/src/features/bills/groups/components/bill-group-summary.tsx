import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { BillGroupSummary } from '../types'
import { formatBillGroupStatus } from './bill-groups-table'

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}

export function BillGroupSummaryCards({ summary }: { summary: BillGroupSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{summary.description}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total original" value={formatCurrency(summary.totalAmount)} />
          <Metric label="Pago" value={formatCurrency(summary.paidAmount)} />
          <Metric label="Pendente" value={formatCurrency(summary.pendingAmount)} />
          <Metric label="Status" value={formatBillGroupStatus(summary.status)} />
          <Metric label="Parcelas ativas" value={`${summary.activeInstallments}/${summary.installmentCount}`} />
          <Metric label="Parcelas pagas" value={String(summary.paidInstallments)} />
          <Metric label="Parcelas vencidas" value={String(summary.overdueInstallments)} />
          <Metric label="Próximo vencimento" value={formatDate(summary.nextDueDate)} />
          <Metric label="Categoria" value={summary.categoryMixed ? 'Misto' : summary.category?.name ?? '-'} />
          <Metric label="Safra" value={summary.safraMixed ? 'Misto' : summary.safra?.name ?? '-'} />
        </div>
        {summary.deletedInstallments > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            {summary.deletedInstallments} parcela{summary.deletedInstallments === 1 ? '' : 's'} excluída
            {summary.deletedInstallments === 1 ? '' : 's'} não entra
            {summary.deletedInstallments === 1 ? '' : 'm'} nos cálculos.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
