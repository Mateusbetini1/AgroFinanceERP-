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

function AccountBalancesCard({ data }: { data: DashboardOperationalSummary }) {
  const visibleAccounts = data.accountBalances.accounts.slice(0, 3)
  const hasMore = data.accountBalances.accounts.length > visibleAccounts.length
  const totalTone = data.accountBalances.totalCurrentBalance < 0 ? 'text-destructive' : 'text-emerald-700'

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
            {formatCurrency(data.accountBalances.totalCurrentBalance)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Saldo previsto do periodo: {formatCurrency(data.summary.expectedBalance)}
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

function PayableItemsCard({ data }: { data: DashboardOperationalSummary }) {
  const items = [
    { label: 'Folha', value: data.payablesBreakdown.payrollCount, href: '/employee-payments' },
    { label: 'Boletos', value: data.payablesBreakdown.billsCount, href: '/bills' },
    { label: 'Despesas', value: data.payablesBreakdown.expensesCount, href: '/expenses' },
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
        <p className="text-2xl font-semibold tracking-normal">{data.payables.count}</p>
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

  const balanceTone = (query.data?.summary.expectedBalance ?? 0) >= 0 ? 'positive' : 'negative'
  const periodLabel =
    mode === 'current-month'
      ? getMonthTitle(selectedMonth)
      : query.data
        ? `${formatDate(query.data.period.startDate)} a ${formatDate(query.data.period.endDate)}`
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

      {query.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
            <SummaryCard
              title="A receber"
              value={formatCurrency(query.data.summary.totalToReceive)}
              detail={`${query.data.receivables.count} pendente(s)`}
              icon={ArrowUpCircle}
              tone="positive"
            />
            <SummaryCard
              title="A pagar total"
              value={formatCurrency(query.data.payablesBreakdown.total)}
              detail="Diversos + folha"
              icon={ArrowDownCircle}
              tone="negative"
            />
            <SummaryCard
              title="Pagamentos diversos"
              value={formatCurrency(query.data.payablesBreakdown.miscellaneousTotal)}
              detail="Boletos + despesas"
              icon={ArrowDownCircle}
              tone="warning"
            />
            <SummaryCard
              title="Folha do mes"
              value={formatCurrency(query.data.payablesBreakdown.payrollTotal)}
              detail={`${query.data.payablesBreakdown.payrollCount} folha(s) em aberto`}
              icon={Banknote}
              href="/employee-payments"
              tone="negative"
            />
            <SummaryCard
              title="Saldo previsto"
              value={formatCurrency(query.data.summary.expectedBalance)}
              detail="A receber menos a pagar"
              icon={Banknote}
              tone={balanceTone}
            />
            <SummaryCard
              title="Recebimentos"
              value={String(query.data.receivables.count)}
              detail="Itens em aberto"
              icon={CalendarClock}
            />
            <PayableItemsCard data={query.data} />
          </div>

          <AccountBalancesCard data={query.data} />

          <AttentionNow
            overduePayables={query.data.payables.overdueCount}
            dueTodayPayables={query.data.payables.dueTodayCount}
            overdueReceivables={query.data.receivables.overdueCount}
            dueTodayReceivables={query.data.receivables.dueTodayCount}
            nextPayable={query.data.nextEvents.nextPayable}
            nextReceivable={query.data.nextEvents.nextReceivable}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <PendingList
              title="A receber"
              items={query.data.receivables.items}
              count={query.data.receivables.count}
              emptyText="Nenhum recebimento pendente no periodo."
              href="/revenues"
            />
            <PendingList
              title="A pagar"
              items={query.data.payables.items}
              count={query.data.payables.count}
              emptyText="Nenhum pagamento pendente no periodo."
              href="/expenses"
            />
          </div>
        </>
      )}
    </div>
  )
}
