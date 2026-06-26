'use client'

import { AlertCircle, ArrowDownCircle, ArrowUpCircle, CalendarClock, Landmark, RefreshCcw, Sprout, Wallet } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { ComponentType } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { getDashboardOverview } from '@/features/dashboard/api'
import { formatCurrency } from '@/lib/utils'

type KpiTone = 'default' | 'positive' | 'negative' | 'warning'

function KpiCard({
  title,
  value,
  icon: Icon,
  tone = 'default',
}: {
  title: string
  value: string
  icon: ComponentType<{ className?: string }>
  tone?: KpiTone
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

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="space-y-3">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-8 w-36 rounded bg-muted" />
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const query = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: getDashboardOverview,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão financeira por regime de caixa.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
          <RefreshCcw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {query.isLoading && <LoadingGrid />}

      {query.isError && (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">Não foi possível carregar o dashboard.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void query.refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {query.data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard title="Saldo total" value={formatCurrency(query.data.totalBalance)} icon={Wallet} />
          <KpiCard
            title="Receitas recebidas"
            value={formatCurrency(query.data.revenueTotal)}
            icon={ArrowUpCircle}
            tone="positive"
          />
          <KpiCard
            title="Saídas pagas"
            value={formatCurrency(query.data.expenseTotal)}
            icon={ArrowDownCircle}
            tone="negative"
          />
          <KpiCard
            title="Resultado líquido"
            value={formatCurrency(query.data.netResult)}
            icon={Landmark}
            tone={query.data.netResult >= 0 ? 'positive' : 'negative'}
          />
          <KpiCard
            title="Recebíveis pendentes"
            value={formatCurrency(query.data.pendingReceivables)}
            icon={ArrowUpCircle}
          />
          <KpiCard
            title="Despesas e boletos pendentes"
            value={formatCurrency(query.data.pendingPayables)}
            icon={ArrowDownCircle}
            tone="warning"
          />
          <KpiCard
            title="Vencidos"
            value={formatCurrency(query.data.overdueTotal)}
            icon={AlertCircle}
            tone="negative"
          />
          <KpiCard title="Safras ativas" value={String(query.data.activeSafras)} icon={Sprout} />
          <KpiCard
            title="Boletos a vencer em 7 dias"
            value={`${query.data.billsDueSoon.count} / ${formatCurrency(query.data.billsDueSoon.total)}`}
            icon={CalendarClock}
            tone="warning"
          />
        </div>
      )}

      {query.data &&
        Object.values({
          totalBalance: query.data.totalBalance,
          revenueTotal: query.data.revenueTotal,
          expenseTotal: query.data.expenseTotal,
          pendingReceivables: query.data.pendingReceivables,
          pendingPayables: query.data.pendingPayables,
        }).every((value) => Number(value) === 0) && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Nenhum movimento financeiro encontrado para o período atual.
            </CardContent>
          </Card>
        )}
    </div>
  )
}
