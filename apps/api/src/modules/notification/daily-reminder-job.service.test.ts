import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  NotificationDeliveryStatus,
  ReminderRecurrenceType,
} from '@agrofinance/database'

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}))

import webpush from 'web-push'
import { createApp } from '../../app'
import { env } from '../../config/env'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'
import { DailyReminderJobService } from './daily-reminder-job.service'

const companyId = 'company-1'
const otherCompanyId = 'company-2'
const userId = 'user-1'
const otherUserId = 'user-2'
const ruleId = 'rule-1'
const referenceDate = new Date('2026-08-06T12:00:00.000Z')
const subscription = {
  id: 'push-1',
  companyId,
  userId,
  endpoint: 'https://push.example/subscription-1',
  p256dh: 'p256dh-key',
  auth: 'auth-key',
}

function configureJobEnv() {
  env.CRON_SECRET = 'cron-secret'
  env.VAPID_PUBLIC_KEY = 'public-key'
  env.VAPID_PRIVATE_KEY = 'private-key'
  env.VAPID_SUBJECT = 'mailto:mateusbertini15@gmail.com'
}

function mockNoAlerts() {
  prismaMock.bill.findMany.mockResolvedValue([])
  prismaMock.expense.findMany.mockResolvedValue([])
  prismaMock.revenue.findMany.mockResolvedValue([])
}

function mockDeliveryLifecycle() {
  prismaMock.notificationDelivery.findUnique.mockResolvedValue(null)
  prismaMock.notificationDelivery.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
    id: 'delivery-1',
    ...args.data,
  }))
  prismaMock.notificationDelivery.update.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
    id: 'delivery-1',
    ...args.data,
  }))
}

function monthlyRule(overrides: Record<string, unknown> = {}) {
  return {
    id: ruleId,
    recurrenceType: ReminderRecurrenceType.MONTHLY_DAY,
    dayOfMonth: 8,
    dueDate: null,
    leadDays: [2],
    ...overrides,
  }
}

function oneTimeRule(overrides: Record<string, unknown> = {}) {
  return {
    id: ruleId,
    recurrenceType: ReminderRecurrenceType.ONE_TIME,
    dayOfMonth: null,
    dueDate: new Date('2026-08-08T12:00:00.000Z'),
    leadDays: [2],
    ...overrides,
  }
}

describe('daily reminders job route guard', () => {
  beforeEach(() => {
    resetPrismaMock()
    configureJobEnv()
  })

  it('rejeita sem x-cron-secret', async () => {
    await request(createApp()).post('/api/v1/notifications/jobs/daily-reminders').expect(401)
  })

  it('rejeita x-cron-secret invalido', async () => {
    await request(createApp())
      .post('/api/v1/notifications/jobs/daily-reminders')
      .set('x-cron-secret', 'wrong')
      .expect(401)
  })

  it('aceita segredo correto', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([])

    await request(createApp())
      .post('/api/v1/notifications/jobs/daily-reminders')
      .set('x-cron-secret', 'cron-secret')
      .send({ dryRun: true })
      .expect(200)
  })
})

describe('DailyReminderJobService.run', () => {
  beforeEach(() => {
    resetPrismaMock()
    configureJobEnv()
    vi.mocked(webpush.setVapidDetails).mockReset()
    vi.mocked(webpush.sendNotification).mockReset()
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as never)
  })

  it('nao envia nada se nao houver PushSubscription ativa', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([])

    const result = await DailyReminderJobService.run({ referenceDate })

    expect(result.sent).toBe(0)
    expect(webpush.sendNotification).not.toHaveBeenCalled()
    expect(prismaMock.notificationDelivery.create).not.toHaveBeenCalled()
  })

  it('nao envia nada se nao houver alertas nem lembretes do dia', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([subscription])
    mockNoAlerts()
    prismaMock.reminderRule.findMany.mockResolvedValue([])

    const result = await DailyReminderJobService.run({ referenceDate })

    expect(result.sent).toBe(0)
    expect(webpush.sendNotification).not.toHaveBeenCalled()
    expect(prismaMock.notificationDelivery.create).not.toHaveBeenCalled()
  })

  it('envia lembrete mensal no dia correto com leadDays 2', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([subscription])
    mockNoAlerts()
    prismaMock.reminderRule.findMany.mockResolvedValue([monthlyRule({ leadDays: [2] })])
    mockDeliveryLifecycle()

    const result = await DailyReminderJobService.run({ referenceDate })

    expect(result.sent).toBe(1)
    expect(prismaMock.notificationDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reminderRuleId: ruleId,
          leadDays: 2,
          dedupeKey: `rule:${ruleId}:lead:2:date:2026-08-06:user:${userId}`,
          body: 'Você tem um lembrete financeiro para verificar.',
          url: '/alerts',
        }),
      }),
    )
    expect(webpush.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: subscription.endpoint }),
      expect.not.stringContaining('R$'),
    )
  })

  it('envia lembrete mensal no dia correto com leadDays 0', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([subscription])
    mockNoAlerts()
    prismaMock.reminderRule.findMany.mockResolvedValue([monthlyRule({ leadDays: [0] })])
    mockDeliveryLifecycle()

    const result = await DailyReminderJobService.run({ referenceDate: new Date('2026-08-08T12:00:00.000Z') })

    expect(result.sent).toBe(1)
    expect(prismaMock.notificationDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadDays: 0,
          dedupeKey: `rule:${ruleId}:lead:0:date:2026-08-08:user:${userId}`,
        }),
      }),
    )
  })

  it('nao envia lembrete fora do dia correto', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([subscription])
    mockNoAlerts()
    prismaMock.reminderRule.findMany.mockResolvedValue([monthlyRule({ leadDays: [2] })])

    const result = await DailyReminderJobService.run({ referenceDate: new Date('2026-08-05T12:00:00.000Z') })

    expect(result.sent).toBe(0)
    expect(webpush.sendNotification).not.toHaveBeenCalled()
    expect(prismaMock.notificationDelivery.create).not.toHaveBeenCalled()
  })

  it('envia regra ONE_TIME no dia correto', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([subscription])
    mockNoAlerts()
    prismaMock.reminderRule.findMany.mockResolvedValue([oneTimeRule()])
    mockDeliveryLifecycle()

    const result = await DailyReminderJobService.run({ referenceDate })

    expect(result.sent).toBe(1)
    expect(prismaMock.notificationDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reminderRuleId: ruleId,
          dedupeKey: `rule:${ruleId}:lead:2:date:2026-08-06:user:${userId}`,
        }),
      }),
    )
  })

  it('nao duplica envio se dedupeKey ja existe com SENT', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([subscription])
    mockNoAlerts()
    prismaMock.reminderRule.findMany.mockResolvedValue([monthlyRule()])
    prismaMock.notificationDelivery.findUnique.mockResolvedValue({
      id: 'delivery-1',
      status: NotificationDeliveryStatus.SENT,
    })

    const result = await DailyReminderJobService.run({ referenceDate })

    expect(result.deduped).toBe(1)
    expect(webpush.sendNotification).not.toHaveBeenCalled()
    expect(prismaMock.notificationDelivery.create).not.toHaveBeenCalled()
  })

  it('cria NotificationDelivery ao enviar resumo de alertas calculados', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([subscription])
    prismaMock.bill.findMany.mockResolvedValue([
      {
        id: 'bill-1',
        description: 'Boleto',
        amount: 100,
        dueDate: new Date('2026-08-06T12:00:00.000Z'),
        status: 'PENDING',
        supplier: null,
      },
    ])
    prismaMock.expense.findMany.mockResolvedValue([])
    prismaMock.revenue.findMany.mockResolvedValue([])
    prismaMock.reminderRule.findMany.mockResolvedValue([])
    mockDeliveryLifecycle()

    const result = await DailyReminderJobService.run({ referenceDate })

    expect(result.sent).toBe(1)
    expect(prismaMock.notificationDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: 'DAILY_SUMMARY',
          dedupeKey: `daily-summary:${companyId}:${userId}:2026-08-06`,
          body: 'Você tem compromissos financeiros para revisar hoje.',
          url: '/alerts',
        }),
      }),
    )
    expect(JSON.stringify(vi.mocked(webpush.sendNotification).mock.calls[0][1])).not.toContain('100')
  })

  it('nao altera boleto, despesa ou receita', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([subscription])
    mockNoAlerts()
    prismaMock.reminderRule.findMany.mockResolvedValue([monthlyRule()])
    mockDeliveryLifecycle()

    await DailyReminderJobService.run({ referenceDate })

    expect(prismaMock.bill.update).not.toHaveBeenCalled()
    expect(prismaMock.bill.updateMany).not.toHaveBeenCalled()
    expect(prismaMock.expense.update).not.toHaveBeenCalled()
    expect(prismaMock.expense.updateMany).not.toHaveBeenCalled()
    expect(prismaMock.revenue.update).not.toHaveBeenCalled()
    expect(prismaMock.revenue.updateMany).not.toHaveBeenCalled()
  })

  it('marca PushSubscription inactive quando web-push retorna erro permanente', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([subscription])
    mockNoAlerts()
    prismaMock.reminderRule.findMany.mockResolvedValue([monthlyRule()])
    mockDeliveryLifecycle()
    vi.mocked(webpush.sendNotification).mockRejectedValue({ statusCode: 410 })

    const result = await DailyReminderJobService.run({ referenceDate })

    expect(result.failed).toBe(1)
    expect(prismaMock.pushSubscription.update).toHaveBeenCalledWith({
      where: { id: subscription.id },
      data: { active: false },
    })
    expect(prismaMock.notificationDelivery.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: NotificationDeliveryStatus.FAILED }),
      }),
    )
  })

  it('nao mistura dados entre empresas e usuarios', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      subscription,
      {
        ...subscription,
        id: 'push-2',
        companyId: otherCompanyId,
        userId: otherUserId,
        endpoint: 'https://push.example/subscription-2',
      },
    ])
    mockNoAlerts()
    prismaMock.reminderRule.findMany.mockResolvedValue([])

    await DailyReminderJobService.run({ referenceDate })

    expect(prismaMock.reminderRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId, userId, deletedAt: null }),
      }),
    )
    expect(prismaMock.reminderRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: otherCompanyId, userId: otherUserId, deletedAt: null }),
      }),
    )
  })

  it('ignora lembretes excluidos no job diario', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([subscription])
    mockNoAlerts()
    prismaMock.reminderRule.findMany.mockResolvedValue([])

    await DailyReminderJobService.run({ referenceDate })

    expect(prismaMock.reminderRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId,
          userId,
          active: true,
          pushEnabled: true,
          deletedAt: null,
        }),
      }),
    )
    expect(webpush.sendNotification).not.toHaveBeenCalled()
    expect(prismaMock.notificationDelivery.create).not.toHaveBeenCalled()
  })
})
