import { beforeEach, describe, expect, it } from 'vitest'
import { DashboardService } from './dashboard.service'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const companyId = 'company-1'

function aggregateAmount(amount: number) {
  return { _sum: { amount } }
}

function aggregateTotalAmount(totalAmount: number) {
  return { _sum: { totalAmount } }
}

function mockMonthlyTotals({
  realizedRevenue = 0,
  pendingRevenue = 0,
  paidExpenses = 0,
  pendingExpenses = 0,
  paidBills = 0,
  pendingBills = 0,
  employeePaymentsPaid = 0,
}: {
  realizedRevenue?: number
  pendingRevenue?: number
  paidExpenses?: number
  pendingExpenses?: number
  paidBills?: number
  pendingBills?: number
  employeePaymentsPaid?: number
} = {}) {
  prismaMock.revenue.aggregate
    .mockResolvedValueOnce(aggregateTotalAmount(realizedRevenue))
    .mockResolvedValueOnce(aggregateTotalAmount(pendingRevenue))
  prismaMock.expense.aggregate
    .mockResolvedValueOnce(aggregateAmount(paidExpenses))
    .mockResolvedValueOnce(aggregateAmount(pendingExpenses))
  prismaMock.bill.aggregate
    .mockResolvedValueOnce(aggregateAmount(paidBills))
    .mockResolvedValueOnce(aggregateAmount(pendingBills))
  prismaMock.employeePayment.aggregate.mockResolvedValue(aggregateAmount(employeePaymentsPaid))
  prismaMock.employee.findMany.mockResolvedValue([])
  prismaMock.employeePayment.findMany.mockResolvedValue([])
}

describe('DashboardService.monthly', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('nao conta transferencias e usa payrollRemaining no resultado previsto', async () => {
    prismaMock.revenue.aggregate
      .mockResolvedValueOnce(aggregateTotalAmount(5000))
      .mockResolvedValueOnce(aggregateTotalAmount(1000))
    prismaMock.expense.aggregate
      .mockResolvedValueOnce(aggregateAmount(200))
      .mockResolvedValueOnce(aggregateAmount(400))
    prismaMock.bill.aggregate
      .mockResolvedValueOnce(aggregateAmount(300))
      .mockResolvedValueOnce(aggregateAmount(500))
    prismaMock.employeePayment.aggregate.mockResolvedValue(aggregateAmount(1000))
    prismaMock.employee.findMany.mockResolvedValue([
      { id: 'employee-1', name: 'Joao', type: 'MONTHLY', baseSalary: 2500 },
    ])
    prismaMock.employeePayment.findMany.mockResolvedValue([
      {
        employeeId: 'employee-1',
        type: 'ADVANCE',
        amount: 1000,
        employee: { id: 'employee-1', name: 'Joao', type: 'MONTHLY', baseSalary: 2500 },
      },
    ])

    const result = await DashboardService.monthly(companyId, 6, 2026)

    expect(prismaMock.transfer.findMany).not.toHaveBeenCalled()
    expect(prismaMock.transfer.aggregate).not.toHaveBeenCalled()
    expect(result.realizedOutflows).toBe(1500)
    expect(result.realizedResult).toBe(3500)
    expect(result.payroll.payrollExpected).toBe(2500)
    expect(result.payroll.payrollRemaining).toBe(1500)
    expect(result.projectedOutflows).toBe(3900)
    expect(result.projectedResult).toBe(2100)
  })

  it('nao inclui receita pendente de agosto no total pendente de junho quando receivedAt esta em agosto', async () => {
    mockMonthlyTotals({ pendingRevenue: 0 })

    const result = await DashboardService.monthly(companyId, 6, 2026)

    const pendingRevenueCall = prismaMock.revenue.aggregate.mock.calls[1]?.[0]
    expect(pendingRevenueCall).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId,
          deletedAt: null,
          status: 'PENDING',
          OR: [
            { receivedAt: { gte: new Date(2026, 5, 1), lt: new Date(2026, 6, 1) } },
            { receivedAt: null, date: { gte: new Date(2026, 5, 1), lt: new Date(2026, 6, 1) } },
          ],
        }),
      }),
    )
    expect(result.pendingRevenue).toBe(0)
  })

  it('inclui receita pendente em agosto quando receivedAt esta em agosto', async () => {
    mockMonthlyTotals({ pendingRevenue: 2750 })

    const result = await DashboardService.monthly(companyId, 8, 2026)

    const pendingRevenueCall = prismaMock.revenue.aggregate.mock.calls[1]?.[0]
    expect(pendingRevenueCall?.where).toEqual(
      expect.objectContaining({
        status: 'PENDING',
        OR: [
          { receivedAt: { gte: new Date(2026, 7, 1), lt: new Date(2026, 8, 1) } },
          { receivedAt: null, date: { gte: new Date(2026, 7, 1), lt: new Date(2026, 8, 1) } },
        ],
      }),
    )
    expect(result.pendingRevenue).toBe(2750)
  })

  it('usa date como fallback para receita pendente sem receivedAt', async () => {
    mockMonthlyTotals({ pendingRevenue: 1000 })

    await DashboardService.monthly(companyId, 6, 2026)

    const pendingRevenueCall = prismaMock.revenue.aggregate.mock.calls[1]?.[0]
    expect(pendingRevenueCall?.where).toEqual(
      expect.objectContaining({
        status: 'PENDING',
        OR: expect.arrayContaining([
          { receivedAt: null, date: { gte: new Date(2026, 5, 1), lt: new Date(2026, 6, 1) } },
        ]),
      }),
    )
  })

  it('usa receivedAt ou date para receita realizada', async () => {
    mockMonthlyTotals({ realizedRevenue: 1500 })

    const result = await DashboardService.monthly(companyId, 8, 2026)

    const realizedRevenueCall = prismaMock.revenue.aggregate.mock.calls[0]?.[0]
    expect(realizedRevenueCall?.where).toEqual(
      expect.objectContaining({
        status: 'RECEIVED',
        OR: [
          { receivedAt: { gte: new Date(2026, 7, 1), lt: new Date(2026, 8, 1) } },
          { receivedAt: null, date: { gte: new Date(2026, 7, 1), lt: new Date(2026, 8, 1) } },
        ],
      }),
    )
    expect(result.realizedRevenue).toBe(1500)
  })
})
