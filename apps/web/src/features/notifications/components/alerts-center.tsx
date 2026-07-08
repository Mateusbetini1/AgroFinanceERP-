'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, RefreshCcw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { cn, formatCurrency, formatDate, formatStatusLabel } from '@/lib/utils'
import { getNotificationAlerts } from '../api'
import type { NotificationAlertGroup, NotificationAlertItem, NotificationSeverity } from '../types'

type AlertsCenterVariant = 'desktop' | 'mobile'

function severityClass(severity: NotificationSeverity) {
  return {
    HIGH: 'border-rose-200 bg-rose-50 text-rose-700',
    MEDIUM: 'border-amber-200 bg-amber-50 text-amber-700',
    LOW: 'border-primary/20 bg-primary/5 text-primary',
  }[severity]
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

function AlertItemRow({ item, compact = false }: { item: NotificationAlertItem; compact?: boolean }) {
  return (
    <Link
      href={item.route}
      className={cn(
        'flex min-w-0 items-center justify-between gap-3 rounded-md border bg-background p-3 text-sm transition-colors hover:bg-accent',
        compact && 'items-start',
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{itemTypeLabel(item.type)}</Badge>
          <span className={cn('rounded-md border px-2 py-0.5 text-xs font-medium', severityClass(item.severity))}>
            {formatStatusLabel(item.status)}
          </span>
        </div>
        <p className="mt-2 truncate font-medium text-foreground">{item.title}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {item.description} · {formatDate(item.date)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-right">
        <span className="text-sm font-semibold text-foreground">{formatCurrency(item.amount)}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  )
}

function GroupBlock({ group, mobile }: { group: NotificationAlertGroup; mobile: boolean }) {
  const visibleItems = mobile ? group.items.slice(0, 2) : group.items
  if (group.items.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
        <span className="text-xs text-muted-foreground">{countLabel(group.items.length)}</span>
      </div>
      <div className="space-y-2">
        {visibleItems.map((item) => (
          <AlertItemRow key={`${item.type}-${item.id}`} item={item} compact={mobile} />
        ))}
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
  const visibleGroups = mobile ? groups.filter((group) => group.items.length > 0).slice(0, 4) : groups

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
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
              <p className="text-xs font-medium text-rose-700">Vencidos</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(alerts.summary.totalOverdueAmount)}</p>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-700">Vencem hoje</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(alerts.summary.totalDueTodayAmount)}</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">Vencem amanhã</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(alerts.summary.totalDueTomorrowAmount)}</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">Próximos 7 dias</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(alerts.summary.totalNext7DaysAmount)}</p>
            </div>
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
          <div className={cn('grid gap-4', !mobile && 'xl:grid-cols-2')}>
            {visibleGroups.map((group) => (
              <GroupBlock key={group.key} group={group} mobile={mobile} />
            ))}
          </div>
        )}

        {mobile && alerts && hasItems(groups) && groups.some((group) => group.items.length > 2) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            Abra o dashboard em uma tela maior para ver todos os itens agrupados.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
