import { beforeEach, describe, expect, it } from 'vitest'
import { DashboardService } from './dashboard.service'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const companyId = 'company-1'

function mockPayroll(baseSalary = 0) {
  prismaMock.employee.findMany.mockResolvedValue(
    baseSalary > 0
      ? [{ id: 'employee-1', name: 'Funcionario', type: 'MONTHLY', baseSalary }]
      : [],
  )
  prismaMock.employeePayment.findMany.mockResolvedValue([])
}

describe('DashboardService.forecast', () => {
  beforeEach(() => {
    resetPrismaMock()
    mockPayroll()
  })

  it('usa saldo atual, inclui apenas pendentes, calcula meses, contas e nao alocados', async () => {
    prismaMock.account.findMany.mockResolvedValue([
      { id: 'account-1', name: 'Sicredi', type: 'BANK', currentBalance: 1000 },
      { id: 'account-2', name: 'Caixa', type: 'CASH', currentBalance: 200 },
    ])
    prismaMock.revenue.findMany.mockResolvedValue([
      {
        id: 'revenue-1',
        accountId: 'account-1',
        date: new Date('2026-07-10T00:00:00.000Z'),
        receivedAt: new Date('2026-08-05T00:00:00.000Z'),
        totalAmount: 700,
      },
      {
        id: 'revenue-2',
        accountId: null,
        date: new Date('2026-07-20T00:00:00.000Z'),
        receivedAt: null,
        totalAmount: 300,
      },
    ])
    prismaMock.expense.findMany.mockResolvedValue([
      {
        id: 'expense-1',
        accountId: 'account-1',
        date: new Date('2026-07-01T00:00:00.000Z'),
        dueDate: new Date('2026-07-15T00:00:00.000Z'),
        amount: 400,
      },
      {
        id: 'expense-2',
        accountId: null,
        date: new Date('2026-06-10T00:00:00.000Z'),
        dueDate: null,
        amount: 100,
      },
    ])
    prismaMock.bill.findMany.mockResolvedValue([
      {
        id: 'bill-1',
        accountId: 'account-1',
        dueDate: new Date('2026-07-25T00:00:00.000Z'),
        amount: 500,
      },
      {
        id: 'bill-2',
        accountId: null,
        dueDate: new Date('2026-08-20T00:00:00.000Z'),
        amount: 250,
      },
    ])
    mockPayroll(1000)

    const result = await DashboardService.forecast(companyId, { months: 2, startMonth: 7, startYear: 2026 })

    expect(result.period).toEqual({ months: 2, startMonth: 7, startYear: 2026, endMonth: 8, endYear: 2026 })
    expect(result.summary.currentTotalBalance).toBe(1200)
    expect(result.months).toHaveLength(2)
    expect(result.months[0]).toEqual(
      expect.objectContaining({
        year: 2026,
        month: 7,
        startingBalance: 1200,
        projectedReceivables: 300,
        projectedExpenses: 500,
        projectedBills: 500,
        projectedPayroll: 1000,
        projectedOutflows: 2000,
        projectedNet: -1700,
        endingBalance: -500,
        unallocatedInflows: 300,
        unallocatedOutflows: 1100,
        alert: 'NEGATIVE',
      }),
    )
    expect(result.months[1]).toEqual(
      expect.objectContaining({
        year: 2026,
        month: 8,
        startingBalance: -500,
        projectedReceivables: 700,
        projectedBills: 250,
        projectedPayroll: 1000,
        endingBalance: -1050,
      }),
    )
    expect(result.accounts.find((account) => account.accountId === 'account-2')).toEqual(
      expect.objectContaining({
        accountId: 'account-2',
        accountName: 'Caixa',
        currentBalance: 200,
        finalProjectedBalance: 200,
      }),
    )
    expect(result.accounts.find((account) => account.accountId === 'account-1')).toEqual(
      expect.objectContaining({
        accountId: 'account-1',
        accountName: 'Sicredi',
        currentBalance: 1000,
        finalProjectedBalance: 800,
      }),
    )
    expect(result.unallocated.totalInflows).toBe(300)
    expect(result.unallocated.totalOutflows).toBe(2350)
    expect(result.summary.firstNegativeMonth).toEqual({ year: 2026, month: 7, balance: -500 })
    expect(result.alerts.some((alert) => alert.type === 'OVERDUE_MOVED_TO_FIRST_MONTH')).toBe(true)
  })

  it('consulta somente itens pendentes e nao usa pagamentos realizados ou transferencias', async () => {
    prismaMock.account.findMany.mockResolvedValue([])
    prismaMock.revenue.findMany.mockResolvedValue([])
    prismaMock.expense.findMany.mockResolvedValue([])
    prismaMock.bill.findMany.mockResolvedValue([])

    await DashboardService.forecast(companyId, { months: 6, startMonth: 1, startYear: 2026 })

    expect(prismaMock.revenue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId,
          deletedAt: null,
          status: 'PENDING',
        }),
      }),
    )
    expect(prismaMock.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId,
          deletedAt: null,
          status: { in: ['PENDING', 'OVERDUE'] },
        }),
      }),
    )
    expect(prismaMock.bill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId,
          deletedAt: null,
          status: { in: ['PENDING', 'OVERDUE'] },
        }),
      }),
    )
    expect(prismaMock.transfer.findMany).not.toHaveBeenCalled()
    expect(prismaMock.transfer.aggregate).not.toHaveBeenCalled()
    expect(prismaMock.employeePayment.aggregate).not.toHaveBeenCalled()
  })

  it('gera a quantidade de buckets solicitada para 18 meses', async () => {
    prismaMock.account.findMany.mockResolvedValue([])
    prismaMock.revenue.findMany.mockResolvedValue([])
    prismaMock.expense.findMany.mockResolvedValue([])
    prismaMock.bill.findMany.mockResolvedValue([])

    const result = await DashboardService.forecast(companyId, { months: 18, startMonth: 10, startYear: 2026 })

    expect(result.months).toHaveLength(18)
    expect(result.period).toEqual({ months: 18, startMonth: 10, startYear: 2026, endMonth: 3, endYear: 2028 })
  })
})
