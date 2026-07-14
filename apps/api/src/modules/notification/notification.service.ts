import { prisma } from '../../config/prisma'
import { env } from '../../config/env'
import { AppError } from '../../shared/errors/AppError'
import webpush from 'web-push'
import type {
  NotificationAlertGroup,
  NotificationAlertItem,
  NotificationAlertsResponse,
  NotificationGroupKey,
  NotificationSeverity,
  PushSubscriptionDto,
} from './notification.schemas'

type GetAlertsOptions = {
  referenceDate?: Date
}

type PayableSource = {
  id: string
  description: string
  amount: unknown
  status: string
  dueDate: Date | null
  supplier?: { name: string } | null
  category?: { name: string } | null
}

type RevenueSource = {
  id: string
  client: string | null
  notes: string | null
  totalAmount: unknown
  date: Date
  receivedAt: Date | null
  status: string
  product?: { name: string } | null
}

function toNumber(value: unknown): number {
  return Number(value ?? 0)
}

function getLocalDayPeriod(date = new Date()) {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const tomorrow = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  const afterTomorrow = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 2)
  const next7End = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 8)

  return { today, tomorrow, afterTomorrow, next7End }
}

function createGroups(): NotificationAlertGroup[] {
  return [
    { key: 'OVERDUE', title: 'Vencidos', items: [] },
    { key: 'DUE_TODAY', title: 'Vencem hoje', items: [] },
    { key: 'DUE_TOMORROW', title: 'Vencem amanha', items: [] },
    { key: 'NEXT_7_DAYS', title: 'Proximos 7 dias', items: [] },
    { key: 'RECEIVABLES', title: 'A receber', items: [] },
  ]
}

function classifyPayableDueDate(dueDate: Date, referenceDate: Date): Exclude<NotificationGroupKey, 'RECEIVABLES'> | null {
  const { today, tomorrow, afterTomorrow, next7End } = getLocalDayPeriod(referenceDate)

  if (dueDate < today) return 'OVERDUE'
  if (dueDate >= today && dueDate < tomorrow) return 'DUE_TODAY'
  if (dueDate >= tomorrow && dueDate < afterTomorrow) return 'DUE_TOMORROW'
  if (dueDate >= afterTomorrow && dueDate < next7End) return 'NEXT_7_DAYS'
  return null
}

function getSeverity(groupKey: NotificationGroupKey): NotificationSeverity {
  if (groupKey === 'OVERDUE' || groupKey === 'DUE_TODAY') return 'HIGH'
  if (groupKey === 'DUE_TOMORROW') return 'MEDIUM'
  return 'LOW'
}

function payableDescription(item: PayableSource): string {
  return item.supplier?.name ?? item.category?.name ?? item.description
}

function revenueTitle(revenue: RevenueSource): string {
  if (revenue.client) return `Receita de ${revenue.client}`
  if (revenue.product?.name) return `Receita de ${revenue.product.name}`
  return 'Receita a receber'
}

function revenueExpectedReceiptDate(revenue: RevenueSource): Date {
  return revenue.receivedAt ?? revenue.date
}

function sortItems(a: NotificationAlertItem, b: NotificationAlertItem) {
  return new Date(a.date).getTime() - new Date(b.date).getTime() || b.amount - a.amount
}

function assertPushConfigured() {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    throw AppError.badRequest(
      'Notificações push não estão configuradas no servidor.',
      'PUSH_NOT_CONFIGURED',
    )
  }

  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)
}

function toWebPushSubscription(subscription: { endpoint: string; p256dh: string; auth: string }) {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  }
}

export const NotificationService = {
  getPublicKey() {
    if (!env.VAPID_PUBLIC_KEY) {
      throw AppError.badRequest(
        'Notificações push não estão configuradas no servidor.',
        'PUSH_NOT_CONFIGURED',
      )
    }

    return { publicKey: env.VAPID_PUBLIC_KEY }
  },

  async subscribe(companyId: string, userId: string, input: PushSubscriptionDto, userAgent?: string | null) {
    assertPushConfigured()

    return prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        companyId,
        userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent,
        active: true,
        lastSeenAt: new Date(),
      },
      update: {
        companyId,
        userId,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent,
        active: true,
        lastSeenAt: new Date(),
      },
    })
  },

  async unsubscribe(companyId: string, userId: string, endpoint: string) {
    const result = await prisma.pushSubscription.updateMany({
      where: { companyId, userId, endpoint },
      data: { active: false, lastSeenAt: new Date() },
    })

    return { deactivated: result.count }
  },

  async sendTest(companyId: string, userId: string) {
    assertPushConfigured()

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { companyId, userId, active: true },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    })

    const payload = JSON.stringify({
      title: 'AgroFinance',
      body: 'AgroFinance: notificações ativadas neste aparelho.',
      url: '/dashboard',
    })

    let sent = 0
    let failed = 0

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(toWebPushSubscription(subscription), payload)
          sent += 1
        } catch (error) {
          failed += 1
          const statusCode =
            error && typeof error === 'object' && 'statusCode' in error
              ? Number((error as { statusCode?: number }).statusCode)
              : null

          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.update({
              where: { id: subscription.id },
              data: { active: false },
            })
          }
        }
      }),
    )

    return { sent, failed, total: subscriptions.length }
  },

  async getAlerts(companyId: string, options: GetAlertsOptions = {}): Promise<NotificationAlertsResponse> {
    const referenceDate = options.referenceDate ?? new Date()
    const { next7End } = getLocalDayPeriod(referenceDate)
    const groups = createGroups()
    const byKey = new Map(groups.map((group) => [group.key, group]))

    const [bills, expenses, revenues] = await Promise.all([
      prisma.bill.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: { in: ['PENDING', 'OVERDUE'] },
          dueDate: { lt: next7End },
        },
        select: {
          id: true,
          description: true,
          amount: true,
          dueDate: true,
          status: true,
          supplier: { select: { name: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.expense.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: { in: ['PENDING', 'OVERDUE'] },
          dueDate: { not: null, lt: next7End },
        },
        select: {
          id: true,
          description: true,
          amount: true,
          dueDate: true,
          status: true,
          supplier: { select: { name: true } },
          category: { select: { name: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.revenue.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: 'PENDING',
        },
        select: {
          id: true,
          client: true,
          notes: true,
          totalAmount: true,
          date: true,
          receivedAt: true,
          status: true,
          product: { select: { name: true } },
        },
        orderBy: [{ receivedAt: 'asc' }, { date: 'asc' }],
      }),
    ])

    const addPayable = (source: PayableSource, type: 'BILL' | 'EXPENSE', route: '/bills' | '/expenses') => {
      if (!source.dueDate) return
      const groupKey = classifyPayableDueDate(source.dueDate, referenceDate)
      if (!groupKey) return

      byKey.get(groupKey)!.items.push({
        id: source.id,
        type,
        title: source.description,
        description: payableDescription(source),
        amount: toNumber(source.amount),
        date: source.dueDate.toISOString(),
        status: source.status,
        route,
        severity: getSeverity(groupKey),
      })
    }

    bills.forEach((bill) => addPayable(bill, 'BILL', '/bills'))
    expenses.forEach((expense) => addPayable(expense, 'EXPENSE', '/expenses'))

    for (const revenue of revenues) {
      const expectedReceiptDate = revenueExpectedReceiptDate(revenue)

      byKey.get('RECEIVABLES')!.items.push({
        id: revenue.id,
        type: 'REVENUE',
        title: revenueTitle(revenue),
        description: revenue.notes ?? revenue.product?.name ?? revenue.client ?? 'Receita pendente',
        amount: toNumber(revenue.totalAmount),
        date: expectedReceiptDate.toISOString(),
        status: revenue.status,
        route: '/revenues',
        severity: 'LOW',
      })
    }

    for (const group of groups) {
      group.items.sort(sortItems)
    }

    const overdue = byKey.get('OVERDUE')!.items
    const dueToday = byKey.get('DUE_TODAY')!.items
    const dueTomorrow = byKey.get('DUE_TOMORROW')!.items
    const next7Days = byKey.get('NEXT_7_DAYS')!.items

    return {
      summary: {
        overdueCount: overdue.length,
        dueTodayCount: dueToday.length,
        dueTomorrowCount: dueTomorrow.length,
        next7DaysCount: next7Days.length,
        totalOverdueAmount: overdue.reduce((sum, item) => sum + item.amount, 0),
        totalDueTodayAmount: dueToday.reduce((sum, item) => sum + item.amount, 0),
        totalDueTomorrowAmount: dueTomorrow.reduce((sum, item) => sum + item.amount, 0),
        totalNext7DaysAmount: next7Days.reduce((sum, item) => sum + item.amount, 0),
      },
      groups,
    }
  },
}
