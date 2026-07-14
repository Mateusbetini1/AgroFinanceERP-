import {
  NotificationDeliveryChannel,
  NotificationDeliverySourceType,
  NotificationDeliveryStatus,
  ReminderRecurrenceType,
} from '@agrofinance/database'
import webpush from 'web-push'
import { prisma } from '../../config/prisma'
import { env } from '../../config/env'
import { AppError } from '../../shared/errors/AppError'
import { NotificationService } from './notification.service'

const TIME_ZONE = 'America/Sao_Paulo'
const PUSH_TITLE = 'AgroFinance'
const REMINDER_BODY = 'Você tem um lembrete financeiro para verificar.'
const ALERTS_BODY = 'Você tem compromissos financeiros para revisar hoje.'
const TARGET_URL = '/alerts'

type PushSubscriptionTarget = {
  id: string
  companyId: string
  userId: string
  endpoint: string
  p256dh: string
  auth: string
}

type DeliveryInput = {
  companyId: string
  userId: string
  reminderRuleId?: string | null
  sourceType: NotificationDeliverySourceType
  sourceId?: string | null
  targetDate: Date
  leadDays?: number | null
  title: string
  body: string
  url: string
  dedupeKey: string
}

type DailyReminderJobOptions = {
  referenceDate?: Date
  dryRun?: boolean
}

function assertCronSecret(secret: string | undefined) {
  if (!env.CRON_SECRET || !secret || secret !== env.CRON_SECRET) {
    throw AppError.unauthorized('Segredo do job inválido')
  }
}

function assertPushConfigured() {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    throw AppError.badRequest('Notificações push não estão configuradas no servidor.', 'PUSH_NOT_CONFIGURED')
  }

  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)
}

function toWebPushSubscription(subscription: PushSubscriptionTarget) {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  }
}

function getSaoPauloDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    ymd: `${values.year}-${values.month}-${values.day}`,
  }
}

function dateFromYmd(ymd: string) {
  return new Date(`${ymd}T12:00:00.000Z`)
}

function addDaysToYmd(ymd: string, days: number) {
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days, 12))
  return date.toISOString().slice(0, 10)
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function shouldFireMonthly(dayOfMonth: number | null, todayYmd: string, leadDays: number) {
  if (!dayOfMonth) return false
  const targetYmd = addDaysToYmd(todayYmd, leadDays)
  const [year, month, day] = targetYmd.split('-').map(Number)

  // Conservador: se o mês não tem esse dia, não dispara nesse ciclo.
  if (dayOfMonth > daysInMonth(year, month)) return false
  return day === dayOfMonth
}

function shouldFireOneTime(dueDate: Date | null, todayYmd: string, leadDays: number) {
  if (!dueDate) return false
  const dueYmd = getSaoPauloDateParts(dueDate).ymd
  return addDaysToYmd(todayYmd, leadDays) === dueYmd
}

function hasRelevantAlerts(alerts: Awaited<ReturnType<typeof NotificationService.getAlerts>>) {
  const receivables = alerts.groups.find((group) => group.key === 'RECEIVABLES')?.items.length ?? 0
  return (
    alerts.summary.overdueCount > 0 ||
    alerts.summary.dueTodayCount > 0 ||
    alerts.summary.dueTomorrowCount > 0 ||
    receivables > 0
  )
}

function groupSubscriptions(subscriptions: PushSubscriptionTarget[]) {
  const targets = new Map<string, { companyId: string; userId: string; subscriptions: PushSubscriptionTarget[] }>()

  for (const subscription of subscriptions) {
    const key = `${subscription.companyId}:${subscription.userId}`
    const existing = targets.get(key)
    if (existing) {
      existing.subscriptions.push(subscription)
    } else {
      targets.set(key, {
        companyId: subscription.companyId,
        userId: subscription.userId,
        subscriptions: [subscription],
      })
    }
  }

  return [...targets.values()]
}

function getPermanentPushStatusCode(error: unknown) {
  const statusCode =
    error && typeof error === 'object' && 'statusCode' in error
      ? Number((error as { statusCode?: number }).statusCode)
      : null

  return statusCode === 404 || statusCode === 410 ? statusCode : null
}

async function sendPushToSubscriptions(subscriptions: PushSubscriptionTarget[], payload: string) {
  let sent = 0
  let failed = 0
  const errors: string[] = []

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(toWebPushSubscription(subscription), payload)
        sent += 1
      } catch (error) {
        failed += 1
        errors.push(error instanceof Error ? error.message : 'Falha ao enviar push')

        if (getPermanentPushStatusCode(error)) {
          await prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: { active: false },
          })
        }
      }
    }),
  )

  return { sent, failed, error: errors.slice(0, 3).join(' | ') || null }
}

async function deliver(input: DeliveryInput, subscriptions: PushSubscriptionTarget[], dryRun: boolean) {
  const existing = await prisma.notificationDelivery.findUnique({
    where: { dedupeKey: input.dedupeKey },
    select: { id: true, status: true },
  })

  if (existing?.status === NotificationDeliveryStatus.SENT || existing?.status === NotificationDeliveryStatus.PENDING) {
    return { sent: 0, failed: 0, skipped: 1, deduped: 1, dryRun: 0 }
  }

  if (dryRun) {
    return { sent: 0, failed: 0, skipped: 0, deduped: 0, dryRun: 1 }
  }

  assertPushConfigured()

  const delivery = existing
    ? await prisma.notificationDelivery.update({
        where: { id: existing.id },
        data: {
          status: NotificationDeliveryStatus.PENDING,
          error: null,
          sentAt: null,
        },
      })
    : await prisma.notificationDelivery.create({
        data: {
          ...input,
          channel: NotificationDeliveryChannel.PUSH,
          status: NotificationDeliveryStatus.PENDING,
        },
      })

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    url: input.url,
  })
  const result = await sendPushToSubscriptions(subscriptions, payload)
  const status = result.sent > 0 ? NotificationDeliveryStatus.SENT : NotificationDeliveryStatus.FAILED

  await prisma.notificationDelivery.update({
    where: { id: delivery.id },
    data: {
      status,
      error: result.error,
      sentAt: status === NotificationDeliveryStatus.SENT ? new Date() : null,
    },
  })

  return { sent: result.sent, failed: result.failed, skipped: 0, deduped: 0, dryRun: 0 }
}

export const DailyReminderJobService = {
  assertCronSecret,

  async run(options: DailyReminderJobOptions = {}) {
    const referenceDate = options.referenceDate ?? new Date()
    const dryRun = options.dryRun ?? false
    const today = getSaoPauloDateParts(referenceDate)
    const targetDate = dateFromYmd(today.ymd)

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { active: true },
      select: {
        id: true,
        companyId: true,
        userId: true,
        endpoint: true,
        p256dh: true,
        auth: true,
      },
      orderBy: [{ companyId: 'asc' }, { userId: 'asc' }],
    })

    const targets = groupSubscriptions(subscriptions)
    const stats = {
      dryRun,
      targetDate: today.ymd,
      targets: targets.length,
      deliveriesCreated: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      deduped: 0,
    }

    for (const target of targets) {
      const alerts = await NotificationService.getAlerts(target.companyId, { referenceDate })
      if (hasRelevantAlerts(alerts)) {
        const result = await deliver(
          {
            companyId: target.companyId,
            userId: target.userId,
            sourceType: NotificationDeliverySourceType.DAILY_SUMMARY,
            targetDate,
            title: PUSH_TITLE,
            body: ALERTS_BODY,
            url: TARGET_URL,
            dedupeKey: `daily-summary:${target.companyId}:${target.userId}:${today.ymd}`,
          },
          target.subscriptions,
          dryRun,
        )
        stats.deliveriesCreated += result.sent > 0 || result.failed > 0 || result.dryRun ? 1 : 0
        stats.sent += result.sent
        stats.failed += result.failed
        stats.skipped += result.skipped
        stats.deduped += result.deduped
      }

      const rules = await prisma.reminderRule.findMany({
        where: {
          companyId: target.companyId,
          userId: target.userId,
          active: true,
          deletedAt: null,
          pushEnabled: true,
        },
        select: {
          id: true,
          recurrenceType: true,
          dayOfMonth: true,
          dueDate: true,
          leadDays: true,
        },
      })

      for (const rule of rules) {
        for (const leadDays of rule.leadDays) {
          const shouldFire =
            rule.recurrenceType === ReminderRecurrenceType.MONTHLY_DAY
              ? shouldFireMonthly(rule.dayOfMonth, today.ymd, leadDays)
              : shouldFireOneTime(rule.dueDate, today.ymd, leadDays)

          if (!shouldFire) continue

          const result = await deliver(
            {
              companyId: target.companyId,
              userId: target.userId,
              reminderRuleId: rule.id,
              sourceType: NotificationDeliverySourceType.REMINDER_RULE,
              sourceId: rule.id,
              targetDate,
              leadDays,
              title: PUSH_TITLE,
              body: REMINDER_BODY,
              url: TARGET_URL,
              dedupeKey: `rule:${rule.id}:lead:${leadDays}:date:${today.ymd}:user:${target.userId}`,
            },
            target.subscriptions,
            dryRun,
          )
          stats.deliveriesCreated += result.sent > 0 || result.failed > 0 || result.dryRun ? 1 : 0
          stats.sent += result.sent
          stats.failed += result.failed
          stats.skipped += result.skipped
          stats.deduped += result.deduped
        }
      }
    }

    return stats
  },
}
