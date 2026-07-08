import jwt from 'jsonwebtoken'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}))

import { createApp } from '../../app'
import { env } from '../../config/env'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'
import { NotificationService } from './notification.service'
import webpush from 'web-push'

const companyId = 'company-1'
const otherCompanyId = 'company-2'
const referenceDate = new Date('2026-07-08T12:00:00.000Z')
const pushPayload = {
  endpoint: 'https://push.example/subscription-1',
  keys: {
    p256dh: 'p256dh-key',
    auth: 'auth-key',
  },
}

function configureVapid() {
  env.VAPID_PUBLIC_KEY = 'public-key'
  env.VAPID_PRIVATE_KEY = 'private-key'
  env.VAPID_SUBJECT = 'mailto:mateusbertini15@gmail.com'
}

function bill(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bill-1',
    description: 'Boleto Adubo',
    amount: 1200,
    dueDate: new Date('2026-07-08T12:00:00.000Z'),
    status: 'PENDING',
    supplier: { name: 'Casa Agricola' },
    ...overrides,
  }
}

function expense(overrides: Record<string, unknown> = {}) {
  return {
    id: 'expense-1',
    description: 'Despesa Defensivos',
    amount: 620,
    dueDate: new Date('2026-07-09T12:00:00.000Z'),
    status: 'PENDING',
    supplier: null,
    category: { name: 'Defensivos' },
    ...overrides,
  }
}

function revenue(overrides: Record<string, unknown> = {}) {
  return {
    id: 'revenue-1',
    client: 'Mercado Central',
    notes: null,
    totalAmount: 900,
    date: new Date('2026-07-10T12:00:00.000Z'),
    status: 'PENDING',
    product: { name: 'Tomate' },
    ...overrides,
  }
}

function itemIds(groupItems: Array<{ id: string }>) {
  return groupItems.map((item) => item.id)
}

describe('notification alerts route guards', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('exige autenticacao', async () => {
    await request(createApp()).get('/api/v1/notifications/alerts').expect(401)
  })

  it('exige company no header autenticado', async () => {
    const token = jwt.sign({ sub: 'user-1', email: 'user@example.com' }, env.JWT_SECRET)

    await request(createApp())
      .get('/api/v1/notifications/alerts')
      .set('Authorization', `Bearer ${token}`)
      .expect(400)
  })
})

describe('NotificationService.getAlerts', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('respeita companyId e nao consulta outra empresa', async () => {
    prismaMock.bill.findMany.mockResolvedValue([])
    prismaMock.expense.findMany.mockResolvedValue([])
    prismaMock.revenue.findMany.mockResolvedValue([])

    await NotificationService.getAlerts(companyId, { referenceDate })

    expect(prismaMock.bill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ companyId }) }),
    )
    expect(prismaMock.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ companyId }) }),
    )
    expect(prismaMock.revenue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ companyId }) }),
    )
    expect(prismaMock.bill.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ companyId: otherCompanyId }) }),
    )
  })

  it('retorna boleto vencido', async () => {
    prismaMock.bill.findMany.mockResolvedValue([bill({ id: 'bill-overdue', dueDate: new Date('2026-07-07T12:00:00.000Z') })])
    prismaMock.expense.findMany.mockResolvedValue([])
    prismaMock.revenue.findMany.mockResolvedValue([])

    const result = await NotificationService.getAlerts(companyId, { referenceDate })
    const overdue = result.groups.find((group) => group.key === 'OVERDUE')!

    expect(itemIds(overdue.items)).toEqual(['bill-overdue'])
    expect(result.summary.overdueCount).toBe(1)
    expect(result.summary.totalOverdueAmount).toBe(1200)
  })

  it('retorna boleto vencendo hoje', async () => {
    prismaMock.bill.findMany.mockResolvedValue([bill({ id: 'bill-today', dueDate: new Date('2026-07-08T15:00:00.000Z') })])
    prismaMock.expense.findMany.mockResolvedValue([])
    prismaMock.revenue.findMany.mockResolvedValue([])

    const result = await NotificationService.getAlerts(companyId, { referenceDate })

    expect(itemIds(result.groups.find((group) => group.key === 'DUE_TODAY')!.items)).toEqual(['bill-today'])
    expect(result.summary.dueTodayCount).toBe(1)
  })

  it('retorna boleto vencendo amanha', async () => {
    prismaMock.bill.findMany.mockResolvedValue([bill({ id: 'bill-tomorrow', dueDate: new Date('2026-07-09T12:00:00.000Z') })])
    prismaMock.expense.findMany.mockResolvedValue([])
    prismaMock.revenue.findMany.mockResolvedValue([])

    const result = await NotificationService.getAlerts(companyId, { referenceDate })

    expect(itemIds(result.groups.find((group) => group.key === 'DUE_TOMORROW')!.items)).toEqual(['bill-tomorrow'])
    expect(result.summary.dueTomorrowCount).toBe(1)
  })

  it('retorna boleto nos proximos 7 dias', async () => {
    prismaMock.bill.findMany.mockResolvedValue([bill({ id: 'bill-next', dueDate: new Date('2026-07-12T12:00:00.000Z') })])
    prismaMock.expense.findMany.mockResolvedValue([])
    prismaMock.revenue.findMany.mockResolvedValue([])

    const result = await NotificationService.getAlerts(companyId, { referenceDate })

    expect(itemIds(result.groups.find((group) => group.key === 'NEXT_7_DAYS')!.items)).toEqual(['bill-next'])
    expect(result.summary.next7DaysCount).toBe(1)
  })

  it('retorna despesa vencida', async () => {
    prismaMock.bill.findMany.mockResolvedValue([])
    prismaMock.expense.findMany.mockResolvedValue([expense({ id: 'expense-overdue', dueDate: new Date('2026-07-06T12:00:00.000Z') })])
    prismaMock.revenue.findMany.mockResolvedValue([])

    const result = await NotificationService.getAlerts(companyId, { referenceDate })

    expect(itemIds(result.groups.find((group) => group.key === 'OVERDUE')!.items)).toEqual(['expense-overdue'])
  })

  it('retorna despesa vencendo amanha', async () => {
    prismaMock.bill.findMany.mockResolvedValue([])
    prismaMock.expense.findMany.mockResolvedValue([expense({ id: 'expense-tomorrow', dueDate: new Date('2026-07-09T12:00:00.000Z') })])
    prismaMock.revenue.findMany.mockResolvedValue([])

    const result = await NotificationService.getAlerts(companyId, { referenceDate })

    expect(itemIds(result.groups.find((group) => group.key === 'DUE_TOMORROW')!.items)).toEqual(['expense-tomorrow'])
  })

  it('retorna receita pendente em A receber', async () => {
    prismaMock.bill.findMany.mockResolvedValue([])
    prismaMock.expense.findMany.mockResolvedValue([])
    prismaMock.revenue.findMany.mockResolvedValue([revenue({ id: 'revenue-pending' })])

    const result = await NotificationService.getAlerts(companyId, { referenceDate })
    const receivables = result.groups.find((group) => group.key === 'RECEIVABLES')!

    expect(itemIds(receivables.items)).toEqual(['revenue-pending'])
    expect(receivables.items[0]).toMatchObject({ type: 'REVENUE', route: '/revenues', amount: 900 })
  })

  it('nao retorna boleto pago nem despesa paga', async () => {
    prismaMock.bill.findMany.mockResolvedValue([])
    prismaMock.expense.findMany.mockResolvedValue([])
    prismaMock.revenue.findMany.mockResolvedValue([])

    const result = await NotificationService.getAlerts(companyId, { referenceDate })

    expect(result.groups.flatMap((group) => group.items)).toHaveLength(0)
    expect(prismaMock.bill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: { in: ['PENDING', 'OVERDUE'] } }) }),
    )
    expect(prismaMock.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: { in: ['PENDING', 'OVERDUE'] } }) }),
    )
  })

  it('nao altera nenhum dado', async () => {
    prismaMock.bill.findMany.mockResolvedValue([bill()])
    prismaMock.expense.findMany.mockResolvedValue([expense()])
    prismaMock.revenue.findMany.mockResolvedValue([revenue()])

    await NotificationService.getAlerts(companyId, { referenceDate })

    expect(prismaMock.bill.update).not.toHaveBeenCalled()
    expect(prismaMock.bill.updateMany).not.toHaveBeenCalled()
    expect(prismaMock.expense.update).not.toHaveBeenCalled()
    expect(prismaMock.expense.updateMany).not.toHaveBeenCalled()
    expect(prismaMock.revenue.update).not.toHaveBeenCalled()
    expect(prismaMock.revenue.updateMany).not.toHaveBeenCalled()
    expect(prismaMock.account.update).not.toHaveBeenCalled()
    expect(prismaMock.transaction.create).not.toHaveBeenCalled()
  })
})

describe('NotificationService push', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(webpush.setVapidDetails).mockReset()
    vi.mocked(webpush.sendNotification).mockReset()
    env.VAPID_PUBLIC_KEY = undefined
    env.VAPID_PRIVATE_KEY = undefined
    env.VAPID_SUBJECT = undefined
  })

  it('public-key retorna chave publica quando configurada', () => {
    configureVapid()

    expect(NotificationService.getPublicKey()).toEqual({ publicKey: 'public-key' })
  })

  it('retorna erro amigavel se VAPID nao configurado', async () => {
    expect(() => NotificationService.getPublicKey()).toThrow('Notificações push não estão configuradas no servidor.')
    await expect(NotificationService.subscribe(companyId, 'user-1', pushPayload)).rejects.toMatchObject({
      code: 'PUSH_NOT_CONFIGURED',
    })
  })

  it('subscribe salva com userId e companyId do backend e ignora companyId do cliente', async () => {
    configureVapid()
    prismaMock.pushSubscription.upsert.mockResolvedValue({ id: 'push-1', active: true })

    await NotificationService.subscribe(
      companyId,
      'user-1',
      { ...pushPayload, companyId: otherCompanyId } as typeof pushPayload & { companyId: string },
      'Android Chrome',
    )

    expect(prismaMock.pushSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { endpoint: pushPayload.endpoint },
        create: expect.objectContaining({
          companyId,
          userId: 'user-1',
          endpoint: pushPayload.endpoint,
          p256dh: pushPayload.keys.p256dh,
          auth: pushPayload.keys.auth,
          userAgent: 'Android Chrome',
          active: true,
        }),
        update: expect.objectContaining({
          companyId,
          userId: 'user-1',
          p256dh: pushPayload.keys.p256dh,
          auth: pushPayload.keys.auth,
          active: true,
        }),
      }),
    )
  })

  it('unsubscribe desativa subscription do usuario e empresa', async () => {
    prismaMock.pushSubscription.updateMany.mockResolvedValue({ count: 1 })

    const result = await NotificationService.unsubscribe(companyId, 'user-1', pushPayload.endpoint)

    expect(result).toEqual({ deactivated: 1 })
    expect(prismaMock.pushSubscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId, userId: 'user-1', endpoint: pushPayload.endpoint },
        data: expect.objectContaining({ active: false }),
      }),
    )
  })

  it('test envia apenas para subscriptions ativas do usuario/company', async () => {
    configureVapid()
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      { id: 'push-1', endpoint: pushPayload.endpoint, p256dh: pushPayload.keys.p256dh, auth: pushPayload.keys.auth },
    ])
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as never)

    const result = await NotificationService.sendTest(companyId, 'user-1')

    expect(prismaMock.pushSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId, userId: 'user-1', active: true },
      }),
    )
    expect(webpush.sendNotification).toHaveBeenCalledWith(
      { endpoint: pushPayload.endpoint, keys: pushPayload.keys },
      expect.stringContaining('notificações ativadas neste aparelho'),
    )
    expect(result).toEqual({ sent: 1, failed: 0, total: 1 })
  })

  it('test marca endpoint invalido como inativo quando push retorna 410', async () => {
    configureVapid()
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      { id: 'push-1', endpoint: pushPayload.endpoint, p256dh: pushPayload.keys.p256dh, auth: pushPayload.keys.auth },
    ])
    vi.mocked(webpush.sendNotification).mockRejectedValue({ statusCode: 410 })

    const result = await NotificationService.sendTest(companyId, 'user-1')

    expect(prismaMock.pushSubscription.update).toHaveBeenCalledWith({
      where: { id: 'push-1' },
      data: { active: false },
    })
    expect(result).toEqual({ sent: 0, failed: 1, total: 1 })
  })
})

describe('notification push route guards and validation', () => {
  beforeEach(() => {
    resetPrismaMock()
    configureVapid()
  })

  it('subscribe exige auth/company', async () => {
    await request(createApp()).post('/api/v1/notifications/push/subscribe').send(pushPayload).expect(401)

    const token = jwt.sign({ sub: 'user-1', email: 'user@example.com' }, env.JWT_SECRET)
    await request(createApp())
      .post('/api/v1/notifications/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send(pushPayload)
      .expect(400)
  })

  it('subscribe rejeita payload invalido', async () => {
    const token = jwt.sign({ sub: 'user-1', email: 'user@example.com' }, env.JWT_SECRET)
    prismaMock.membership.findUnique.mockResolvedValue({
      active: true,
      role: 'OWNER',
      company: { id: companyId, name: 'Empresa', active: true, deletedAt: null },
    })

    await request(createApp())
      .post('/api/v1/notifications/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .set('x-company-id', '11111111-1111-4111-8111-111111111111')
      .send({ endpoint: 'invalid', keys: {} })
      .expect(422)
  })
})
