'use client'

import Link from 'next/link'
import type { ComponentType } from 'react'
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CalendarClock,
  Landmark,
  PlusCircle,
  Receipt,
  RefreshCcw,
  WalletCards,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { AlertsCenter } from '@/features/notifications/components/alerts-center'
import { cn, formatCurrency } from '@/lib/utils'
import type { DashboardLive, DashboardMonthly } from '../types'

type MobileTone = 'default' | 'positive' | 'negative' | 'warning'

function toneClass(tone: MobileTone) {
  return {
    default: 'border-primary/20 bg-primary/5 text-primary',
    positive: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    negative: 'border-rose-200 bg-rose-50 text-rose-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
  }[tone]
}

function MobileMetricCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = 'default',
}: {
  title: string
  value: string
  helper?: string
  icon: ComponentType<{ className?: string }>
  tone?: MobileTone
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-muted-foreground">{title}</p>
          <p className="mt-1 break-words text-xl font-semibold tracking-normal text-foreground">{value}</p>
        </div>
        <div className={cn('shrink-0 rounded-md border p-2', toneClass(tone))}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {helper && <p className="mt-2 text-xs text-muted-foreground">{helper}</p>}
    </div>
  )
}

function QuickLink({
  href,
  label,
  icon: Icon,
  variant = 'outline',
}: {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  variant?: 'default' | 'outline'
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
        variant === 'default'
          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
          : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  )
}

export function MobileDashboardHome({
  live,
  monthly,
  isLiveLoading,
  isLiveError,
  onRetryLive,
}: {
  live?: DashboardLive
  monthly?: DashboardMonthly
  isLiveLoading: boolean
  isLiveError: boolean
  onRetryLive: () => void
}) {
  return (
    <section className="space-y-4 lg:hidden">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Hoje</p>
            <h2 className="text-xl font-semibold tracking-normal text-foreground">Resumo rapido</h2>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onRetryLive}>
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {isLiveLoading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" />
            Carregando posicao financeira...
          </div>
        )}

        {isLiveError && (
          <div className="mt-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            Nao foi possivel carregar a posicao financeira.
          </div>
        )}

        {live && (
          <div className="mt-4 grid gap-3">
            <MobileMetricCard
              title="Saldo atual"
              value={formatCurrency(live.position.totalBalance)}
              helper="Soma das contas ativas"
              icon={Landmark}
              tone={live.position.totalBalance >= 0 ? 'positive' : 'negative'}
            />

            <div className="grid grid-cols-2 gap-3">
              <MobileMetricCard
                title="A pagar 7 dias"
                value={formatCurrency(live.commitments.payablesNext7Days)}
                icon={ArrowDownCircle}
                tone={live.commitments.payablesNext7Days > 0 ? 'warning' : 'positive'}
              />
              <MobileMetricCard
                title="A receber 7 dias"
                value={formatCurrency(live.commitments.receivablesNext7Days)}
                icon={ArrowUpCircle}
                tone="positive"
              />
              <MobileMetricCard
                title="Vencidos"
                value={formatCurrency(live.commitments.overduePayables)}
                icon={AlertTriangle}
                tone={live.commitments.overduePayables > 0 ? 'negative' : 'positive'}
              />
              <MobileMetricCard
                title="Saldo 30 dias"
                value={formatCurrency(live.projection.projectedBalance30Days)}
                icon={CalendarClock}
                tone={live.projection.projectedBalance30Days >= 0 ? 'positive' : 'negative'}
              />
            </div>
          </div>
        )}

        {monthly && (
          <div className="mt-3">
            <MobileMetricCard
              title="Resultado do mes"
              value={formatCurrency(monthly.projectedResult)}
              helper={`Realizado: ${formatCurrency(monthly.realizedResult)}`}
              icon={WalletCards}
              tone={monthly.projectedResult >= 0 ? 'positive' : 'negative'}
            />
          </div>
        )}
      </div>

      <AlertsCenter variant="mobile" />

      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <h2 className="text-base font-semibold tracking-normal">Acoes rapidas</h2>
            <p className="text-sm text-muted-foreground">Atalhos para as rotinas mais usadas.</p>
          </div>
          <div className="grid gap-2">
            <QuickLink href="/revenues" label="Nova receita" icon={ArrowUpCircle} variant="default" />
            <QuickLink href="/expenses" label="Nova despesa" icon={Receipt} />
            <QuickLink href="/bills" label="Novo boleto" icon={PlusCircle} />
            <QuickLink href="/bills" label="Ver boletos" icon={Banknote} />
            <QuickLink href="/cashflow/forecast" label="Fluxo projetado" icon={CalendarClock} />
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
