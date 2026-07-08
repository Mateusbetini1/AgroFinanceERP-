'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  RefreshCcw,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { getNotificationAlerts } from '../api'
import type {
  NotificationAlertGroup,
  NotificationAlertItem,
  NotificationGroupKey,
  NotificationSeverity,
} from '../types'

type AlertsCenterVariant = 'desktop' | 'mobile'

const groupPriority: NotificationGroupKey[] = ['OVERDUE', 'DUE_TODAY', 'DUE_TOMORROW', 'RECEIVABLES', 'NEXT_7_DAYS']

function severityClass(severity: NotificationSeverity) {
  return {
    HIGH: 'border-rose-200 bg-rose-50 text-rose-700',
    MEDIUM: 'border-amber-200 bg-amber-50 text-amber-700',
    LOW: 'border-primary/20 bg-primary/5 text-primary',
  }[severity]
}

function rowTone(item: NotificationAlertItem) {
  if (item.severity === 'HIGH') return 'border-rose-200 bg-rose-50/60 hover:bg-rose-50'
  if (item.severity === 'MEDIUM') return 'border-amber-200 bg-amber-50/50 hover:bg-amber-50'
  return 'bg-background hover:bg-accent'
}

function itemTypeLabel(type: NotificationAlertItem['type']) {
  return {
    BILL: 'Boleto',
    EXPENSE: 'Despesa',
    REVENUE: 'Receita',
  }[type]
}

function countLabel(count: number) {
  return count === 1 ? '1 item' : `${count} itens`
}

function hasItems(groups: NotificationAlertGroup[]) {
  return groups.some((group) => group.items.length > 0)
}

function getGroup(groups: NotificationAlertGroup[], key: NotificationGroupKey) {
  return groups.find((group) => group.key === key)
}

function getGroupTotal(group: NotificationAlertGroup | undefined) {
  return group?.items.reduce((sum, item) => sum + item.amount, 0) ?? 0
}

function sortedVisibleGroups(groups: NotificationAlertGroup[], mobile: boolean) {
  const groupsByKey = new Map(groups.map((group) => [group.key, group]))
  const populated = groupPriority
    .map((key) => groupsByKey.get(key))
    .filter((group): group is NotificationAlertGroup => Boolean(group && group.items.length > 0))

  return mobile ? populated.slice(0, 3) : populated
}

function dueText(item: NotificationAlertItem, groupKey: NotificationGroupKey) {
  if (item.type === 'REVENUE') return `prevista para ${formatDate(item.date)}`
  if (groupKey === 'OVERDUE') return `vencida desde ${formatDate(item.date)}`
  if (groupKey === 'DUE_TODAY') return 'vence hoje'
  if (groupKey === 'DUE_TOMORROW') return 'vence amanha'
  return `vence em ${formatDate(item.date)}`
}

function itemTitle(item: NotificationAlertItem, groupKey: NotificationGroupKey) {
  const description = item.description && item.description !== item.title ? ` - ${item.description}` : ''
  return `${itemTypeLabel(item.type)} - ${item.title}${description} - ${dueText(item, groupKey)}`
}

function actionLinks(group: NotificationAlertGroup) {
  const routes = new Map<NotificationAlertItem['route'], string>()

  for (const item of group.items) {
    if (item.route === '/bills') routes.set('/bills', 'Ver boletos')
    if (item.route === '/expenses') routes.set('/expenses', 'Ver despesas')
    if (item.route === '/revenues') routes.set('/revenues', 'Ver receitas')
  }

  return [...routes.entries()]
}

function SummaryPill({
  label,
  value,
  count,
  tone,
}: {
  label: string
  value: number
  count: number
  tone: 'danger' | 'warning' | 'default' | 'positive'
}) {
  if (count === 0 && value === 0) return null

  const toneClass = {
    danger: 'border-rose-200 bg-rose-50 text-rose-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    default: 'border-border bg-muted/30 text-muted-foreground',
    positive: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }[tone]

  return (
    <div className={cn('rounded-md border p-3', toneClass)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">{label}</p>
        <span className="text-[11px]">{countLabel(count)}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(value)}</p>
    </div>
  )
}

function AlertItemRow({
  item,
  groupKey,
  compact = false,
}: {
  item: NotificationAlertItem
  groupKey: NotificationGroupKey
  compact?: boolean
}) {
  const overdue = groupKey === 'OVERDUE'

  return (
    <Link
      href={item.route}
      className={cn(
        'flex min-w-0 items-start justify-between gap-3 rounded-md border p-3 text-sm transition-colors',
        rowTone(item),
        compact && 'p-2.5',
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={overdue ? 'destructive' : 'outline'}>{itemTypeLabel(item.type)}</Badge>
          <span className={cn('rounded-md border px-2 py-0.5 text-xs font-medium', severityClass(item.severity))}>
            {overdue ? 'Vencido' : dueText(item, groupKey)}
          </span>
        </div>
        <p className={cn('mt-2 line-clamp-2 font-medium', overdue ? 'text-rose-800' : 'text-foreground')}>
          {itemTitle(item, groupKey)}
        </p>
        {!compact && <p className="mt-1 truncate text-xs text-muted-foreground">{formatDate(item.date)}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2 text-right">
        <span className={cn('text-sm font-semibold', overdue ? 'text-rose-700' : 'text-foreground')}>
          {formatCurrency(item.amount)}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  )
}

function GroupBlock({ group, mobile }: { group: NotificationAlertGroup; mobile: boolean }) {
  const maxItems = mobile ? 2 : 4
  const visibleItems = group.items.slice(0, maxItems)
  const hiddenCount = group.items.length - visibleItems.length
  const links = actionLinks(group)

  return (
    <div className={cn('space-y-2 rounded-md border p-3', group.key === 'OVERDUE' && 'border-rose-200 bg-rose-50/30')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={cn('text-sm font-semibold', group.key === 'OVERDUE' ? 'text-rose-800' : 'text-foreground')}>
            {group.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            {countLabel(group.items.length)} · {formatCurrency(getGroupTotal(group))}
          </p>
        </div>

        {links.length === 1 && (
          <Link
            href={links[0][0]}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-input bg-background px-2 text-xs font-medium hover:bg-accent"
          >
            {links[0][1]}
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <div className="space-y-2">
        {visibleItems.map((item) => (
          <AlertItemRow key={`${item.type}-${item.id}`} item={item} groupKey={group.key} compact={mobile} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {links.length > 1 &&
          links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-input bg-background px-2 text-xs font-medium hover:bg-accent"
            >
              {label}
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ))}

        {hiddenCount > 0 && (
          <span className="text-xs text-muted-foreground">
            +{hiddenCount} {hiddenCount === 1 ? 'item' : 'itens'} na tela de origem
          </span>
        )}
      </div>
    </div>
  )
}

export function AlertsCenter({ variant = 'desktop', className }: { variant?: AlertsCenterVariant; className?: string }) {
  const mobile = variant === 'mobile'
  const alertsQuery = useQuery({
    queryKey: ['notifications', 'alerts'],
    queryFn: getNotificationAlerts,
  })

  const alerts = alertsQuery.data
  const groups = alerts?.groups ?? []
  const visibleGroups = sortedVisibleGroups(groups, mobile)
  const receivables = getGroup(groups, 'RECEIVABLES')
  const next7Days = getGroup(groups, 'NEXT_7_DAYS')

  return (
    <Card className={className}>
      <CardHeader className={cn('space-y-3', mobile && 'p-4')}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <CardTitle className={cn('tracking-normal', mobile ? 'text-base' : 'text-lg')}>Atenção agora</CardTitle>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void alertsQuery.refetch()}>
            <RefreshCcw className="h-4 w-4" />
            {!mobile && 'Atualizar'}
          </Button>
        </div>

        {alerts && hasItems(groups) && (
          <div className={cn('grid gap-2', mobile ? 'grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-4')}>
            <SummaryPill
              label="Vencidos"
              value={alerts.summary.totalOverdueAmount}
              count={alerts.summary.overdueCount}
              tone="danger"
            />
            <SummaryPill
              label="Vencem hoje"
              value={alerts.summary.totalDueTodayAmount}
              count={alerts.summary.dueTodayCount}
              tone="warning"
            />
            <SummaryPill
              label="Vencem amanhã"
              value={alerts.summary.totalDueTomorrowAmount}
              count={alerts.summary.dueTomorrowCount}
              tone="default"
            />
            <SummaryPill
              label="A receber"
              value={getGroupTotal(receivables)}
              count={receivables?.items.length ?? 0}
              tone="positive"
            />
            {!mobile && (
              <SummaryPill
                label="Próximos 7 dias"
                value={alerts.summary.totalNext7DaysAmount}
                count={alerts.summary.next7DaysCount}
                tone="default"
              />
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className={cn('space-y-4', mobile && 'p-4 pt-0')}>
        {alertsQuery.isLoading && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" />
            Carregando alertas...
          </div>
        )}

        {alertsQuery.isError && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            Não foi possível carregar os alertas.
          </div>
        )}

        {alerts && !hasItems(groups) && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Sem alertas importantes no momento.
          </div>
        )}

        {alerts && hasItems(groups) && (
          <div className={cn('grid gap-3', !mobile && 'xl:grid-cols-2')}>
            {visibleGroups.map((group) => (
              <GroupBlock key={group.key} group={group} mobile={mobile} />
            ))}
          </div>
        )}

        {mobile &&
          alerts &&
          hasItems(groups) &&
          (visibleGroups.length < groups.filter((group) => group.items.length > 0).length ||
            Boolean(next7Days?.items.length)) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            Outros alertas ficam acessíveis pelas telas de boletos, despesas e receitas.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
