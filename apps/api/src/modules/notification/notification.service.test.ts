import jwt from 'jsonwebtoken'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../app'
import { env } from '../../config/env'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'
import { NotificationService } from './notification.service'

const companyId = 'company-1'
const otherCompanyId = 'company-2'
const referenceDate = new Date('2026-07-08T12:00:00.000Z')

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
