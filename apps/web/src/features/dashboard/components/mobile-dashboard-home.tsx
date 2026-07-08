'use client'

import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Bot,
  CalendarClock,
  Landmark,
  PlusCircle,
  Receipt,
  RefreshCcw,
  UserRound,
  WalletCards,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { AlertsCenter } from '@/features/notifications/components/alerts-center'
import { cn, formatCurrency, formatEmployeeType } from '@/lib/utils'
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
  featured = false,
}: {
  title: string
  value: string
  helper?: string
  icon: ComponentType<{ className?: string }>
  tone?: MobileTone
  featured?: boolean
}) {
  return (
    <div className={cn('rounded-md border bg-card p-3', featured && 'col-span-2')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className={cn('mt-1 break-words font-semibold tracking-normal text-foreground', featured ? 'text-xl' : 'text-lg')}>
            {value}
          </p>
        </div>
        <div className={cn('shrink-0 rounded-md border p-2', toneClass(tone))}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
    </div>
  )
}

function MonthlyRow({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: MobileTone
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          'shrink-0 text-right text-sm font-semibold text-foreground',
          tone === 'positive' && 'text-emerald-700',
          tone === 'negative' && 'text-rose-700',
          tone === 'warning' && 'text-amber-700',
        )}
      >
        {value}
      </span>
    </div>
  )
}

function MonthlyGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border bg-background px-3">
      <p className="border-b py-2 text-xs font-semibold text-muted-foreground">{title}</p>
      {children}
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
        'inline-flex h-10 w-full items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
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

function MobileQuickSummary({
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
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Hoje</p>
            <h2 className="text-base font-semibold tracking-normal text-foreground">Resumo rápido</h2>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-8 px-2" onClick={onRetryLive}>
            <RefreshCcw className="h-3.5 w-3.5" />
            Atualizar
          </Button>
        </div>

        {isLiveLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" />
            Carregando posição...
          </div>
        )}

        {isLiveError && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            Não foi possível carregar a posição financeira.
          </div>
        )}

        {live && (
          <div className="grid grid-cols-2 gap-3">
            <MobileMetricCard
              title="Saldo"
              value={formatCurrency(live.position.totalBalance)}
              helper="Contas ativas"
              icon={Landmark}
              tone={live.position.totalBalance >= 0 ? 'positive' : 'negative'}
              featured
            />
            <MobileMetricCard
              title="Pagar 7d"
              value={formatCurrency(live.commitments.payablesNext7Days)}
              icon={ArrowDownCircle}
              tone={live.commitments.payablesNext7Days > 0 ? 'warning' : 'positive'}
            />
            <MobileMetricCard
              title="Receber 7d"
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
              title="Saldo 30d"
              value={formatCurrency(live.projection.projectedBalance30Days)}
              icon={CalendarClock}
              tone={live.projection.projectedBalance30Days >= 0 ? 'positive' : 'negative'}
            />
          </div>
        )}

        {monthly && (
          <MobileMetricCard
            title="Resultado do mês"
            value={formatCurrency(monthly.projectedResult)}
            helper={`Realizado: ${formatCurrency(monthly.realizedResult)}`}
            icon={WalletCards}
            tone={monthly.projectedResult >= 0 ? 'positive' : 'negative'}
          />
        )}
      </CardContent>
    </Card>
  )
}

function formatMonthYear(monthly: DashboardMonthly) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(monthly.year, monthly.month - 1, 1))
    .replace(/^./, (char) => char.toUpperCase())
}

function MobileMonthlySummary({ monthly }: { monthly?: DashboardMonthly }) {
  if (!monthly) return null

  const payrollEmployees = monthly.payroll.employees
  const monthLabel = formatMonthYear(monthly)

  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-base tracking-normal">Visão mensal — {monthLabel}</CardTitle>
        <p className="text-xs text-muted-foreground">Entradas, saídas e resultado do período.</p>
      </CardHeader>
      <CardContent className="space-y-3 p-3 pt-0">
        <MonthlyGroup title="Entradas">
          <MonthlyRow label="Receitas realizadas" value={formatCurrency(monthly.realizedRevenue)} tone="positive" />
          <MonthlyRow label="Receitas pendentes" value={formatCurrency(monthly.pendingRevenue)} />
        </MonthlyGroup>

        <MonthlyGroup title="Saídas">
          <MonthlyRow label="Saídas pagas" value={formatCurrency(monthly.realizedOutflows)} tone="negative" />
          <MonthlyRow
            label="Pendentes"
            value={formatCurrency(monthly.pendingExpenses + monthly.pendingBills)}
            tone="warning"
          />
          <MonthlyRow label="Folha prevista" value={formatCurrency(monthly.payroll.payrollExpected)} />
          <MonthlyRow label="Folha paga" value={formatCurrency(monthly.payroll.payrollTotalPaid)} tone="negative" />
          <MonthlyRow label="Falta pagar folha" value={formatCurrency(monthly.payroll.payrollRemaining)} tone="warning" />
        </MonthlyGroup>

        <MonthlyGroup title="Resultado">
          <MonthlyRow
            label="Resultado realizado"
            value={formatCurrency(monthly.realizedResult)}
            tone={monthly.realizedResult >= 0 ? 'positive' : 'negative'}
          />
          <MonthlyRow
            label="Resultado previsto"
            value={formatCurrency(monthly.projectedResult)}
            tone={monthly.projectedResult >= 0 ? 'positive' : 'negative'}
          />
        </MonthlyGroup>

        <details className="rounded-md border bg-background">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-medium">
            <span className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              Ver detalhes da folha
            </span>
            <span className="text-xs text-muted-foreground">{payrollEmployees.length} func.</span>
          </summary>
          <div className="space-y-2 border-t p-3">
            <p className="text-xs text-muted-foreground">Mensalistas entram na previsão. Diaristas aparecem pelo total pago.</p>

            {payrollEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum funcionário ou pagamento neste mês.</p>
            ) : (
              payrollEmployees.map((employee) => (
                <div key={employee.employeeId} className="rounded-md border bg-muted/20 p-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{employee.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{formatEmployeeType(employee.employeeType)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(employee.totalPaid)}</p>
                      <p className="text-xs text-muted-foreground">pago</p>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <span>Previsto: {formatCurrency(employee.expectedSalary)}</span>
                    <span className="text-right">Falta: {formatCurrency(employee.remainingSalary)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </details>
      </CardContent>
    </Card>
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
    <section className="space-y-3 lg:hidden">
      <AlertsCenter variant="mobile" />

      <MobileQuickSummary
        live={live}
        monthly={monthly}
        isLiveLoading={isLiveLoading}
        isLiveError={isLiveError}
        onRetryLive={onRetryLive}
      />

      <Card>
        <CardContent className="space-y-3 p-3">
          <div>
            <h2 className="text-base font-semibold tracking-normal">Ações rápidas</h2>
            <p className="text-xs text-muted-foreground">Lançamentos e consultas frequentes.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <QuickLink href="/revenues" label="Nova receita" icon={ArrowUpCircle} variant="default" />
            <QuickLink href="/expenses" label="Nova despesa" icon={Receipt} />
            <QuickLink href="/bills" label="Novo boleto" icon={PlusCircle} />
            <QuickLink href="/assistant" label="Assistente" icon={Bot} />
          </div>
        </CardContent>
      </Card>

      <MobileMonthlySummary monthly={monthly} />
    </section>
  )
}
