'use client'

import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Landmark,
  PlusCircle,
  RefreshCcw,
} from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useState, type ComponentType, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { getDashboardOperationalSummary } from '@/features/dashboard/api'
import type { DashboardOperationalSummary, OperationalSummaryItem, OperationalSummaryMode } from '@/features/dashboard/types'
import { cn, formatAccountType, formatCurrency, formatDate, formatStatusLabel } from '@/lib/utils'

type SummaryTone = 'default' | 'positive' | 'negative' | 'warning'

const modes: Array<{ value: OperationalSummaryMode; label: string }> = [
  { value: 'current-month', label: 'Mes selecionado' },
  { value: 'next-30-days', label: 'Proximos 30 dias' },
]

const quickActions = [
  { href: '/revenues', label: 'Nova receita' },
  { href: '/expenses', label: 'Nova despesa' },
  { href: '/bills', label: 'Novo boleto' },
  { href: '/employee-payments', label: 'Pagamento funcionario' },
]

type PayablesBreakdown = NonNullable<DashboardOperationalSummary['payablesBreakdown']>
type AccountBalances = NonNullable<DashboardOperationalSummary['accountBalances']>
type ActualsSummary = NonNullable<DashboardOperationalSummary['actualsSummary']>
type SafeAccountBalances = Omit<AccountBalances, 'projectedBalanceAfterPeriod'> & {
  projectedBalanceAfterPeriod: number
}
type LegacySummary = DashboardOperationalSummary['summary'] & {
  totalPayable?: number
  payablesTotal?: number
}

const emptyReceivables = {
  totalPending: 0,
  count: 0,
  overdueCount: 0,
  dueTodayCount: 0,
  items: [] as OperationalSummaryItem[],
}

const emptyPayables = {
  totalPending: 0,
  count: 0,
  overdueCount: 0,
  dueTodayCount: 0,
  items: [] as OperationalSummaryItem[],
}

const emptyActualsSummary: ActualsSummary = {
  receivedTotal: 0,
  receivedCount: 0,
  paidTotal: 0,
  paidCount: 0,
  paidBillsTotal: 0,
  paidBillsCount: 0,
  paidExpensesTotal: 0,
  paidExpensesCount: 0,
  employeePaymentsTotal: 0,
  employeePaymentsCount: 0,
  netActualResult: 0,
}

function numberOrZero(value: unknown) {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function getExpectedBalance(data: DashboardOperationalSummary | undefined) {
  return numberOrZero(data?.summary?.expectedBalance)
}

function getPayablesBreakdown(data: DashboardOperationalSummary | undefined): PayablesBreakdown {
  const items = data?.payables?.items ?? []
  const legacySummary = data?.summary as LegacySummary | undefined
  const itemTotal = items.reduce((sum, item) => sum + numberOrZero(item.amount), 0)
  const payrollItems = items.filter((item) => item.type === 'PAYROLL')
  const billItems = items.filter((item) => item.type === 'BILL')
  const expenseItems = items.filter((item) => item.type === 'EXPENSE')
  const payrollTotal = payrollItems.reduce((sum, item) => sum + numberOrZero(item.amount), 0)
  const billsTotal = billItems.reduce((sum, item) => sum + numberOrZero(item.amount), 0)
  const expensesTotal = expenseItems.reduce((sum, item) => sum + numberOrZero(item.amount), 0)
  const existing = data?.payablesBreakdown

  return {
    total: numberOrZero(
      existing?.total ??
        legacySummary?.totalToPay ??
        legacySummary?.totalPayable ??
        legacySummary?.payablesTotal ??
        data?.payables?.totalPending ??
        itemTotal,
    ),
    payrollTotal: numberOrZero(existing?.payrollTotal ?? payrollTotal),
    billsTotal: numberOrZero(existing?.billsTotal ?? billsTotal),
    expensesTotal: numberOrZero(existing?.expensesTotal ?? expensesTotal),
    miscellaneousTotal: numberOrZero(existing?.miscellaneousTotal ?? billsTotal + expensesTotal),
    payrollCount: numberOrZero(existing?.payrollCount ?? payrollItems.length),
    billsCount: numberOrZero(existing?.billsCount ?? billItems.length),
    expensesCount: numberOrZero(existing?.expensesCount ?? expenseItems.length),
  }
}

function getAccountBalances(data: DashboardOperationalSummary | undefined): SafeAccountBalances {
  const totalCurrentBalance = numberOrZero(data?.accountBalances?.totalCurrentBalance)
  const projectedBalanceAfterPeriod = numberOrZero(
    data?.accountBalances?.projectedBalanceAfterPeriod ??
      data?.summary?.projectedBalanceAfterPeriod ??
      totalCurrentBalance + getExpectedBalance(data),
  )

  return {
    totalCurrentBalance,
    projectedBalanceAfterPeriod,
    accounts: data?.accountBalances?.accounts ?? [],
  }
}

function getActualsSummary(data: DashboardOperationalSummary | undefined): ActualsSummary {
  const actuals = data?.actualsSummary

  return {
    receivedTotal: numberOrZero(actuals?.receivedTotal),
    receivedCount: numberOrZero(actuals?.receivedCount),
    paidTotal: numberOrZero(actuals?.paidTotal),
    paidCount: numberOrZero(actuals?.paidCount),
    paidBillsTotal: numberOrZero(actuals?.paidBillsTotal),
    paidBillsCount: numberOrZero(actuals?.paidBillsCount),
    paidExpensesTotal: numberOrZero(actuals?.paidExpensesTotal),
    paidExpensesCount: numberOrZero(actuals?.paidExpensesCount),
    employeePaymentsTotal: numberOrZero(actuals?.employeePaymentsTotal),
    employeePaymentsCount: numberOrZero(actuals?.employeePaymentsCount),
    netActualResult: numberOrZero(actuals?.netActualResult),
  }
}

function SummaryCard({
  title,
  value,
  detail,
  icon: Icon,
  href,
  tone = 'default',
}: {
  title: string
  value: string
  detail?: ReactNode
  icon: ComponentType<{ className?: string }>
  href?: string
  tone?: SummaryTone
}) {
  const toneClass = {
    default: 'bg-primary/10 text-primary',
    positive: 'bg-emerald-100 text-emerald-700',
    negative: 'bg-rose-100 text-rose-700',
    warning: 'bg-amber-100 text-amber-700',
  }[tone]

  const card = (
    <Card className={cn(href && 'transition-colors hover:bg-muted/30')}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn('rounded-md p-2', toneClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-normal">{value}</p>
        {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  )

  if (!href) return card

  return (
    <Link href={href} className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
      {card}
    </Link>
  )
}

function statusBadge(item: OperationalSummaryItem) {
  if (item.isOverdue) return <Badge variant="destructive">Vencido</Badge>
  if (item.isToday) return <Badge variant="warning">Hoje</Badge>
  return <Badge variant="muted">{formatStatusLabel(item.status)}</Badge>
}

function itemTypeLabel(type: OperationalSummaryItem['type']) {
  const labels = {
    REVENUE: 'Receita',
    EXPENSE: 'Despesa',
    BILL: 'Boleto',
    PAYROLL: 'Folha',
  }

  return labels[type]
}

function itemRoute(type: OperationalSummaryItem['type']) {
  const routes = {
    REVENUE: '/revenues',
    EXPENSE: '/expenses',
    BILL: '/bills',
    PAYROLL: '/employee-payments',
  }

  return routes[type]
}

function EventLine({ label, item }: { label: string; item: OperationalSummaryItem | null }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{item ? item.title : 'Nenhum item aberto'}</p>
      </div>
      {item && (
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold">{formatCurrency(item.amount)}</p>
          <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
        </div>
      )}
    </div>
  )
}

function AttentionNow({
  overduePayables,
  dueTodayPayables,
  overdueReceivables,
  dueTodayReceivables,
  nextPayable,
  nextReceivable,
}: {
  overduePayables: number
  dueTodayPayables: number
  overdueReceivables: number
  dueTodayReceivables: number
  nextPayable: OperationalSummaryItem | null
  nextReceivable: OperationalSummaryItem | null
}) {
  const alerts = [
    { label: 'Pagamentos vencidos', value: overduePayables, tone: overduePayables > 0 ? 'text-destructive' : 'text-muted-foreground' },
    { label: 'Pagamentos hoje', value: dueTodayPayables, tone: dueTodayPayables > 0 ? 'text-amber-700' : 'text-muted-foreground' },
    { label: 'Recebimentos atrasados', value: overdueReceivables, tone: overdueReceivables > 0 ? 'text-destructive' : 'text-muted-foreground' },
    { label: 'Recebimentos hoje', value: dueTodayReceivables, tone: dueTodayReceivables > 0 ? 'text-amber-700' : 'text-muted-foreground' },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Atencao agora
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {alerts.map((alert) => (
            <div key={alert.label} className="rounded-md border border-border px-3 py-2">
              <p className="text-xs text-muted-foreground">{alert.label}</p>
              <p className={cn('text-xl font-semibold', alert.tone)}>{alert.value}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-2 lg:grid-cols-2">
          <EventLine label="Proximo pagamento" item={nextPayable} />
          <EventLine label="Proximo recebimento" item={nextReceivable} />
        </div>
      </CardContent>
    </Card>
  )
}

function AccountBalancesCard({ accountBalances }: { accountBalances: SafeAccountBalances }) {
  const visibleAccounts = accountBalances.accounts.slice(0, 3)
  const hasMore = accountBalances.accounts.length > visibleAccounts.length
  const totalTone = accountBalances.totalCurrentBalance < 0 ? 'text-destructive' : 'text-emerald-700'

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-4 w-4 text-primary" />
            Saldos das contas
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Saldo atual das contas = dinheiro/saldo operacional atual.
          </p>
        </div>
        <Link href="/accounts" className="text-sm font-medium text-primary hover:underline">
          Ver contas
        </Link>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Total atual em contas</p>
          <p className={cn('text-2xl font-semibold tracking-normal', totalTone)}>
            {formatCurrency(accountBalances.totalCurrentBalance)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Saldo projetado apos periodo: {formatCurrency(accountBalances.projectedBalanceAfterPeriod)}
          </p>
        </div>

        {visibleAccounts.length === 0 ? (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
            Nenhuma conta ativa encontrada.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visibleAccounts.map((account) => (
              <Link
                key={account.id}
                href={`/accounts/${account.id}`}
                className="grid grid-cols-[1fr_auto] gap-3 py-2 transition-colors hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{account.name}</p>
                  <p className="text-xs text-muted-foreground">{formatAccountType(account.type)}</p>
                </div>
                <p
                  className={cn(
                    'shrink-0 text-right text-sm font-semibold',
                    account.currentBalance < 0 && 'text-destructive',
                  )}
                >
                  {formatCurrency(account.currentBalance)}
                </p>
              </Link>
            ))}
            {hasMore && <p className="pt-2 text-xs text-muted-foreground">Mostrando as 3 primeiras contas.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PendingList({
  title,
  items,
  count,
  emptyText,
  href,
}: {
  title: string
  items: OperationalSummaryItem[]
  count: number
  emptyText: string
  href: string
}) {
  const visibleItems = items.slice(0, 5)
  const hasMore = count > visibleItems.length

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{count} em aberto</p>
        </div>
        {hasMore && (
          <Link href={href} className="text-sm font-medium text-primary hover:underline">
            Ver todos
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {visibleItems.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            {emptyText}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visibleItems.map((item) => (
              <Link
                key={`${item.type}-${item.id}`}
                href={itemRoute(item.type)}
                className="grid grid-cols-[1fr_auto] gap-3 py-3 transition-colors hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn('truncate text-sm font-medium', item.isOverdue && 'text-destructive')}>
                      {item.title}
                    </p>
                    {statusBadge(item)}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {itemTypeLabel(item.type)} - {formatDate(item.date)}
                    {item.supplier ? ` - ${item.supplier.name}` : ''}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold">{formatCurrency(item.amount)}</p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function LoadingState() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="space-y-3">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-8 w-32 rounded bg-muted" />
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}

function getMonthTitle(date: Date) {
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function addMonthsToDate(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function PayableItemsCard({ breakdown, count }: { breakdown: PayablesBreakdown; count: number }) {
  const items = [
    { label: 'Folha', value: breakdown.payrollCount, href: '/employee-payments' },
    { label: 'Boletos', value: breakdown.billsCount, href: '/bills' },
    { label: 'Despesas', value: breakdown.expensesCount, href: '/expenses' },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Itens a pagar</CardTitle>
        <div className="rounded-md bg-amber-100 p-2 text-amber-700">
          <Clock3 className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-normal">{count}</p>
        <div className="mt-2 grid gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-md px-2 py-1 text-xs transition-colors hover:bg-muted"
            >
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium text-foreground">{item.value}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const now = new Date()
  const [mode, setMode] = useState<OperationalSummaryMode>('current-month')
  const [selectedMonth, setSelectedMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const query = useQuery({
    queryKey: ['dashboard', 'operational-summary', mode, selectedMonth.getFullYear(), selectedMonth.getMonth() + 1],
    queryFn: () =>
      getDashboardOperationalSummary(mode, {
        month: selectedMonth.getMonth() + 1,
        year: selectedMonth.getFullYear(),
      }),
  })

  const dashboard = query.data
  const receivables = dashboard?.receivables ?? emptyReceivables
  const payables = dashboard?.payables ?? emptyPayables
  const receivableItems = receivables.items ?? []
  const payableItems = payables.items ?? []
  const receivablesCount = numberOrZero(receivables.count ?? receivableItems.length)
  const payablesCount = numberOrZero(payables.count ?? payableItems.length)
  const payablesBreakdown = getPayablesBreakdown(dashboard)
  const accountBalances = getAccountBalances(dashboard)
  const actualsSummary = dashboard ? getActualsSummary(dashboard) : emptyActualsSummary
  const expectedBalance = getExpectedBalance(dashboard)
  const totalToReceive = numberOrZero(dashboard?.summary?.totalToReceive ?? receivables.totalPending)
  const nextEvents = dashboard?.nextEvents ?? { nextReceivable: null, nextPayable: null }
  const balanceTone = expectedBalance >= 0 ? 'positive' : 'negative'
  const periodLabel =
    mode === 'current-month'
      ? getMonthTitle(selectedMonth)
      : dashboard?.period?.startDate && dashboard?.period?.endDate
        ? `${formatDate(dashboard.period.startDate)} a ${formatDate(dashboard.period.endDate)}`
        : 'Hoje a +30 dias'

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-normal text-foreground lg:text-2xl">Painel do mes</h1>
          <p className="text-sm text-muted-foreground">{periodLabel} - recebimentos e pagamentos em aberto.</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-[190px_auto_auto] sm:items-center">
          <Select value={mode} onChange={(event) => setMode(event.target.value as OperationalSummaryMode)}>
            {modes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          {mode === 'current-month' && (
            <div className="grid grid-cols-[40px_1fr_40px] items-center rounded-md border border-input bg-background">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Mes anterior"
                onClick={() => setSelectedMonth((current) => addMonthsToDate(current, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="min-w-[150px] text-center text-sm font-medium">{getMonthTitle(selectedMonth)}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Proximo mes"
                onClick={() => setSelectedMonth((current) => addMonthsToDate(current, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Button type="button" variant="outline" onClick={() => void query.refetch()} loading={query.isFetching}>
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <PlusCircle className="h-4 w-4" />
            {action.label}
          </Link>
        ))}
      </div>

      {query.isLoading && <LoadingState />}

      {query.isError && (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">Nao foi possivel carregar o painel operacional.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void query.refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {dashboard && (
        <>
          <section className="space-y-3" aria-labelledby="actuals-summary-title">
            <div>
              <h2 id="actuals-summary-title" className="text-base font-semibold text-foreground">
                Realizado no m&ecirc;s
              </h2>
              <p className="text-xs text-muted-foreground">Entradas e sa&iacute;das efetivadas no m&ecirc;s de refer&ecirc;ncia.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <SummaryCard
                title={'Recebido no m\u00eas'}
                value={formatCurrency(actualsSummary.receivedTotal)}
                detail={`${actualsSummary.receivedCount} recebimento(s)`}
                icon={ArrowUpCircle}
                tone="positive"
              />
              <SummaryCard
                title={'Pago no m\u00eas'}
                value={formatCurrency(actualsSummary.paidTotal)}
                detail={`Boletos ${actualsSummary.paidBillsCount} \u00b7 Despesas ${actualsSummary.paidExpensesCount} \u00b7 Funcion\u00e1rios ${actualsSummary.employeePaymentsCount}`}
                icon={ArrowDownCircle}
                tone="negative"
              />
              <SummaryCard
                title="Resultado realizado"
                value={formatCurrency(actualsSummary.netActualResult)}
                detail="Recebido menos pago"
                icon={CheckCircle2}
                tone={actualsSummary.netActualResult >= 0 ? 'positive' : 'negative'}
              />
            </div>
          </section>

          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">Pend&ecirc;ncias em aberto</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
              <SummaryCard
                title="A receber em aberto"
                value={formatCurrency(totalToReceive)}
                detail={`${receivablesCount} pendente(s)`}
                icon={ArrowUpCircle}
                tone="positive"
              />
              <SummaryCard
                title="A pagar em aberto"
                value={formatCurrency(payablesBreakdown.total)}
                detail="Diversos + folha"
                icon={ArrowDownCircle}
                tone="negative"
              />
              <SummaryCard
                title="Pagamentos diversos em aberto"
                value={formatCurrency(payablesBreakdown.miscellaneousTotal)}
                detail="Boletos + despesas"
                icon={ArrowDownCircle}
                tone="warning"
              />
              <SummaryCard
                title={'Folha do m\u00eas em aberto'}
                value={formatCurrency(payablesBreakdown.payrollTotal)}
                detail={`${payablesBreakdown.payrollCount} folha(s) em aberto`}
                icon={Banknote}
                href="/employee-payments"
                tone="negative"
              />
              <SummaryCard
                title="Saldo previsto"
                value={formatCurrency(expectedBalance)}
                detail="A receber menos a pagar"
                icon={Banknote}
                tone={balanceTone}
              />
              <SummaryCard
                title="Recebimentos em aberto"
                value={String(receivablesCount)}
                detail="Itens em aberto"
                icon={CalendarClock}
              />
              <PayableItemsCard breakdown={payablesBreakdown} count={payablesCount} />
            </div>
          </div>

          <AccountBalancesCard accountBalances={accountBalances} />

          <AttentionNow
            overduePayables={numberOrZero(payables.overdueCount)}
            dueTodayPayables={numberOrZero(payables.dueTodayCount)}
            overdueReceivables={numberOrZero(receivables.overdueCount)}
            dueTodayReceivables={numberOrZero(receivables.dueTodayCount)}
            nextPayable={nextEvents.nextPayable ?? null}
            nextReceivable={nextEvents.nextReceivable ?? null}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <PendingList
              title="A receber em aberto"
              items={receivableItems}
              count={receivablesCount}
              emptyText="Nenhum recebimento pendente no periodo."
              href="/revenues"
            />
            <PendingList
              title="A pagar em aberto"
              items={payableItems}
              count={payablesCount}
              emptyText="Nenhum pagamento pendente no periodo."
              href="/expenses"
            />
          </div>
        </>
      )}
    </div>
  )
}
