import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardService } from './dashboard.service'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const companyId = 'company-1'

function pendingRevenue(id: string, date: Date, amount: number, client: string, receivedAt: Date | null = null) {
  return {
    id,
    date,
    receivedAt,
    totalAmount: amount,
    status: 'PENDING',
    client,
    notes: null,
    product: { id: `product-${id}`, name: `Produto ${id}` },
  }
}

function pendingExpense(id: string, dueDate: Date, amount: number, description: string) {
  return {
    id,
    description,
    amount,
    status: 'PENDING',
    date: dueDate,
    dueDate,
    category: { id: `category-${id}`, name: 'Energia' },
    supplier: null,
  }
}

function pendingBill(id: string, dueDate: Date, amount: number, description: string) {
  return {
    id,
    description,
    amount,
    status: 'PENDING',
    dueDate,
    category: null,
    supplier: { id: `supplier-${id}`, name: 'Fornecedor' },
  }
}

describe('DashboardService.operationalSummary', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 14, 10, 0, 0))
  })

  it('ordena receitas e calcula vencido/proximo recebimento pela data prevista de recebimento', async () => {
    prismaMock.revenue.findMany.mockResolvedValue([
      pendingRevenue('revenue-17', new Date(2026, 6, 10), 1200, 'Cliente Pimentao', new Date(2026, 6, 17)),
      pendingRevenue('revenue-15', new Date(2026, 6, 12), 800, 'Cliente Tomate', new Date(2026, 6, 15)),
    ])
    prismaMock.expense.findMany.mockResolvedValue([])
    prismaMock.bill.findMany.mockResolvedValue([])
    prismaMock.employee.findMany.mockResolvedValue([])
    prismaMock.employeePayment.findMany.mockResolvedValue([])

    const result = await DashboardService.operationalSummary(companyId, { mode: 'current-month' })

    expect(result.receivables.items.map((item) => item.id)).toEqual(['revenue-15', 'revenue-17'])
    expect(result.receivables.items[1]).toEqual(
      expect.objectContaining({
        id: 'revenue-17',
        date: new Date(2026, 6, 17),
        isOverdue: false,
        isToday: false,
      }),
    )
    expect(result.receivables.overdueCount).toBe(0)
    expect(result.nextEvents.nextReceivable?.id).toBe('revenue-15')
    expect(prismaMock.revenue.update).not.toHaveBeenCalled()
    expect(prismaMock.account.update).not.toHaveBeenCalled()
    expect(prismaMock.transaction.create).not.toHaveBeenCalled()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sem year/month usa o mes atual com pendencias, folha restante e eventos ordenados', async () => {
    prismaMock.revenue.findMany.mockResolvedValue([
      pendingRevenue('revenue-2', new Date(2026, 6, 20), 800, 'Cliente B'),
      pendingRevenue('revenue-1', new Date(2026, 6, 10), 1200, 'Cliente A'),
    ])
    prismaMock.expense.findMany.mockResolvedValue([
      pendingExpense('expense-1', new Date(2026, 6, 14), 300, 'Energia'),
    ])
    prismaMock.bill.findMany.mockResolvedValue([
      pendingBill('bill-1', new Date(2026, 6, 18), 500, 'Boleto fornecedor A'),
    ])
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

    const result = await DashboardService.operationalSummary(companyId, { mode: 'current-month' })

    expect(result.period).toEqual({
      mode: 'current-month',
      startDate: new Date(2026, 6, 1),
      endDate: new Date(2026, 7, 1),
    })
    expect(result.summary.totalToReceive).toBe(2000)
    expect(result.summary.totalToPay).toBe(2300)
    expect(result.summary.expectedBalance).toBe(-300)
    expect(result.receivables.count).toBe(2)
    expect(result.payables.count).toBe(3)
    expect(result.payroll).toEqual({ expected: 2500, paid: 1000, remaining: 1500 })
    expect(result.receivables.items.map((item) => item.id)).toEqual(['revenue-1', 'revenue-2'])
    expect(result.payables.items.map((item) => item.id)).toEqual(['expense-1', 'bill-1', 'payroll-2026-7'])
    expect(result.receivables.items[0]).toEqual(expect.objectContaining({ isOverdue: true, isToday: false }))
    expect(result.payables.items[0]).toEqual(expect.objectContaining({ isOverdue: false, isToday: true }))
    expect(result.nextEvents.nextPayable?.id).toBe('expense-1')
    expect(result.nextEvents.nextReceivable?.id).toBe('revenue-2')
  })

  it('com year/month usa o mes informado', async () => {
    prismaMock.revenue.findMany.mockResolvedValue([
      pendingRevenue('revenue-august', new Date(2026, 7, 5), 900, 'Cliente Agosto'),
    ])
    prismaMock.expense.findMany.mockResolvedValue([
      pendingExpense('expense-august', new Date(2026, 7, 12), 400, 'Energia agosto'),
    ])
    prismaMock.bill.findMany.mockResolvedValue([])
    prismaMock.employee.findMany.mockResolvedValue([
      { id: 'employee-1', name: 'Joao', type: 'MONTHLY', baseSalary: 2500 },
    ])
    prismaMock.employeePayment.findMany.mockResolvedValue([
      {
        employeeId: 'employee-1',
        type: 'SALARY',
        amount: 1500,
        employee: { id: 'employee-1', name: 'Joao', type: 'MONTHLY', baseSalary: 2500 },
      },
    ])

    const result = await DashboardService.operationalSummary(companyId, {
      mode: 'current-month',
      month: 8,
      year: 2026,
    })

    expect(result.period).toEqual({
      mode: 'current-month',
      startDate: new Date(2026, 7, 1),
      endDate: new Date(2026, 8, 1),
    })
    expect(result.summary).toEqual({ totalToReceive: 900, totalToPay: 1400, expectedBalance: -500 })
    expect(result.payroll).toEqual({ expected: 2500, paid: 1500, remaining: 1000 })
    expect(prismaMock.revenue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { receivedAt: { gte: new Date(2026, 7, 1), lt: new Date(2026, 8, 1) } },
            { receivedAt: null, date: { gte: new Date(2026, 7, 1), lt: new Date(2026, 8, 1) } },
          ],
        }),
      }),
    )
    expect(prismaMock.employeePayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ referenceMonth: 8, referenceYear: 2026 }),
      }),
    )
  })

  it('usa proximos 30 dias como periodo ate 13/08 e mantem somente itens em aberto nas consultas', async () => {
    prismaMock.revenue.findMany.mockResolvedValue([
      pendingRevenue('revenue-1', new Date(2026, 7, 12), 700, 'Cliente A'),
    ])
    prismaMock.expense.findMany.mockResolvedValue([])
    prismaMock.bill.findMany.mockResolvedValue([
      pendingBill('bill-1', new Date(2026, 7, 12), 300, 'Boleto fornecedor A'),
    ])
    prismaMock.employee.findMany.mockResolvedValue([])
    prismaMock.employeePayment.findMany.mockResolvedValue([])

    const result = await DashboardService.operationalSummary(companyId, { mode: 'next-30-days' })

    expect(result.period.startDate).toEqual(new Date(2026, 6, 14))
    expect(result.period.endDate).toEqual(new Date(2026, 7, 13))
    expect(result.summary).toEqual({ totalToReceive: 700, totalToPay: 300, expectedBalance: 400 })
    expect(prismaMock.revenue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PENDING' }),
      }),
    )
    expect(prismaMock.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { in: ['PENDING', 'OVERDUE'] } }),
      }),
    )
    expect(prismaMock.bill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { in: ['PENDING', 'OVERDUE'] } }),
      }),
    )
  })

  it('mudanca de mes nao altera saldo, status ou ledger financeiro', async () => {
    prismaMock.revenue.findMany.mockResolvedValue([])
    prismaMock.expense.findMany.mockResolvedValue([])
    prismaMock.bill.findMany.mockResolvedValue([])
    prismaMock.employee.findMany.mockResolvedValue([])
    prismaMock.employeePayment.findMany.mockResolvedValue([])

    await DashboardService.operationalSummary(companyId, { mode: 'current-month', month: 9, year: 2026 })

    expect(prismaMock.account.update).not.toHaveBeenCalled()
    expect(prismaMock.account.aggregate).not.toHaveBeenCalled()
    expect(prismaMock.transaction.create).not.toHaveBeenCalled()
    expect(prismaMock.revenue.update).not.toHaveBeenCalled()
    expect(prismaMock.expense.update).not.toHaveBeenCalled()
    expect(prismaMock.bill.update).not.toHaveBeenCalled()
  })
})
