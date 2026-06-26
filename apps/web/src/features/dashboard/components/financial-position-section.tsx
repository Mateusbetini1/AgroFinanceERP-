'use client'

import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  Landmark,
  RefreshCcw,
  WalletCards,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency } from '@/lib/utils'
import type { DashboardLive } from '../types'
import { AccountBalances } from './account-balances'
import { FinancialAlerts } from './financial-alerts'
import { RecentMovements } from './recent-movements'

type KpiTone = 'default' | 'positive' | 'negative' | 'warning'

function LiveKpiCard({
  title,
  value,
  icon: Icon,
  tone = 'default',
}: {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
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

function LiveLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
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

export function FinancialPositionSection({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data?: DashboardLive
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-normal text-foreground">Posição financeira atual</h2>
          <p className="text-sm text-muted-foreground">
            Saldos, movimentos de hoje, compromissos próximos e alertas de caixa.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCcw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {isLoading && <LiveLoading />}

      {isError && (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">Não foi possível carregar a posição financeira.</p>
            </div>
            <Button type="button" variant="outline" onClick={onRetry}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <LiveKpiCard
              title="Saldo total em contas"
              value={formatCurrency(data.position.totalBalance)}
              icon={Landmark}
              tone={data.position.totalBalance >= 0 ? 'positive' : 'negative'}
            />
            <LiveKpiCard
              title="Entradas hoje"
              value={formatCurrency(data.today.todayInflow)}
              icon={ArrowUpCircle}
              tone="positive"
            />
            <LiveKpiCard
              title="Saídas hoje"
              value={formatCurrency(data.today.todayOutflow)}
              icon={ArrowDownCircle}
              tone="negative"
            />
            <LiveKpiCard
              title="Movimento líquido hoje"
              value={formatCurrency(data.today.todayNetMovement)}
              icon={WalletCards}
              tone={data.today.todayNetMovement >= 0 ? 'positive' : 'negative'}
            />
            <LiveKpiCard
              title="A receber em 7 dias"
              value={formatCurrency(data.commitments.receivablesNext7Days)}
              icon={CalendarClock}
            />
            <LiveKpiCard
              title="A pagar em 7 dias"
              value={formatCurrency(data.commitments.payablesNext7Days)}
              icon={CalendarClock}
              tone="warning"
            />
            <LiveKpiCard
              title="Saldo projetado em 7 dias"
              value={formatCurrency(data.projection.projectedBalance7Days)}
              icon={Landmark}
              tone={data.projection.projectedBalance7Days >= 0 ? 'positive' : 'negative'}
            />
            <LiveKpiCard
              title="Saldo projetado em 30 dias"
              value={formatCurrency(data.projection.projectedBalance30Days)}
              icon={Landmark}
              tone={data.projection.projectedBalance30Days >= 0 ? 'positive' : 'negative'}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <AccountBalances
              balances={data.position.balancesByAccount}
              projections={data.projection.projectedByAccount30Days}
            />
            <FinancialAlerts alerts={data.alerts} />
            <RecentMovements movements={data.recentMovements} />
          </div>

          {(data.projection.unassignedReceivables30Days > 0 || data.projection.unassignedPayables30Days > 0) && (
            <Card>
              <CardContent className="flex flex-col gap-2 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>Existem valores sem conta definida nos próximos 30 dias.</span>
                <span>
                  A receber: {formatCurrency(data.projection.unassignedReceivables30Days)} • A pagar:{' '}
                  {formatCurrency(data.projection.unassignedPayables30Days)}
                </span>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" />
          Atualizando posição financeira...
        </div>
      )}
    </section>
  )
}
