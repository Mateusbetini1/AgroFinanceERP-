import { AlertTriangle, CalendarClock, TrendingDown, TrendingUp, WalletCards } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { CashflowForecast } from '../types'

function monthLabel(month: number, year: number) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

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

export function ForecastSummary({ forecast }: { forecast: CashflowForecast }) {
  const firstNegative = forecast.summary.firstNegativeMonth

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <SummaryCard
        title="Saldo atual total"
        value={formatCurrency(forecast.summary.currentTotalBalance)}
        icon={WalletCards}
        tone={forecast.summary.currentTotalBalance >= 0 ? 'positive' : 'negative'}
      />
      <SummaryCard
        title="Saldo final projetado"
        value={formatCurrency(forecast.summary.finalProjectedBalance)}
        icon={CalendarClock}
        tone={forecast.summary.finalProjectedBalance >= 0 ? 'positive' : 'negative'}
      />
      <SummaryCard
        title="Menor saldo projetado"
        value={formatCurrency(forecast.summary.lowestProjectedBalance)}
        icon={AlertTriangle}
        tone={forecast.summary.lowestProjectedBalance >= 0 ? 'warning' : 'negative'}
      />
      <SummaryCard
        title="Primeiro mes negativo"
        value={firstNegative ? monthLabel(firstNegative.month, firstNegative.year) : '-'}
        icon={AlertTriangle}
        tone={firstNegative ? 'negative' : 'positive'}
      />
      <SummaryCard
        title="Total a receber"
        value={formatCurrency(forecast.summary.totalReceivables)}
        icon={TrendingUp}
        tone="positive"
      />
      <SummaryCard
        title="Total a pagar"
        value={formatCurrency(forecast.summary.totalPayables)}
        icon={TrendingDown}
        tone="negative"
      />
    </div>
  )
}
