import { BarChart3, Scale, TrendingDown, TrendingUp, WalletCards } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { SafraReportSummary as SafraReportSummaryType } from '../types'

function SummaryCard({
  title,
  value,
  icon: Icon,
  tone = 'default',
}: {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  tone?: 'default' | 'positive' | 'negative' | 'warning'
}) {
  const toneClass = {
    default: 'bg-primary/10 text-primary',
    positive: 'bg-emerald-100 text-emerald-700',
    negative: 'bg-rose-100 text-rose-700',
    warning: 'bg-amber-100 text-amber-700',
  }[tone]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`rounded-md p-2 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-normal">{value}</p>
      </CardContent>
    </Card>
  )
}

export function SafraReportSummary({ items }: { items: SafraReportSummaryType[] }) {
  const totals = items.reduce(
    (acc, item) => {
      acc.revenue += item.totalRevenue
      acc.expenses += item.totalExpenses
      acc.projected += item.projectedResult
      acc.realized += item.realizedResult
      if (item.estimatedYield && item.estimatedYield > 0) {
        acc.expensesForUnit += item.totalExpenses
        acc.yieldForUnit += item.estimatedYield
      }
      return acc
    },
    { revenue: 0, expenses: 0, projected: 0, realized: 0, expensesForUnit: 0, yieldForUnit: 0 },
  )

  const costPerUnit = totals.yieldForUnit > 0 ? totals.expensesForUnit / totals.yieldForUnit : null

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <SummaryCard title="Receitas totais" value={formatCurrency(totals.revenue)} icon={TrendingUp} tone="positive" />
      <SummaryCard title="Despesas totais" value={formatCurrency(totals.expenses)} icon={TrendingDown} tone="negative" />
      <SummaryCard
        title="Resultado previsto"
        value={formatCurrency(totals.projected)}
        icon={BarChart3}
        tone={totals.projected >= 0 ? 'positive' : 'negative'}
      />
      <SummaryCard
        title="Resultado realizado"
        value={formatCurrency(totals.realized)}
        icon={WalletCards}
        tone={totals.realized >= 0 ? 'positive' : 'negative'}
      />
      <SummaryCard
        title="Custo por un. estimada"
        value={costPerUnit === null ? '-' : formatCurrency(costPerUnit)}
        icon={Scale}
        tone="warning"
      />
    </div>
  )
}
