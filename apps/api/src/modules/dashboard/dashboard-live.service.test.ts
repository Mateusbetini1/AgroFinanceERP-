import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardService } from './dashboard.service'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const companyId = 'company-1'
const accountId = 'account-1'
const secondAccountId = 'account-2'

function amountAggregate(amount: number) {
  return { _sum: { amount } }
}

function totalAmountAggregate(totalAmount: number) {
  return { _sum: { totalAmount } }
}

function setupLiveMocks({
  accounts = [
    { id: accountId, name: 'Sicredi', type: 'BANK', currentBalance: 1000, active: true },
  ],
  todayRevenue = 0,
  todayExpense = 0,
  todayBill = 0,
  todayEmployeePayment = 0,
  todayTransfer = 0,
  pendingRevenues = [],
  pendingExpenses = [],
  pendingBills = [],
  payrollEmployees = [],
  payrollPayments = [],
  recentRevenues = [],
  recentExpenses = [],
  recentBills = [],
  recentEmployeePayments = [],
  recentTransfers = [],
}: {
  accounts?: unknown[]
  todayRevenue?: number
  todayExpense?: number
  todayBill?: number
  todayEmployeePayment?: number
  todayTransfer?: number
  pendingRevenues?: unknown[]
  pendingExpenses?: unknown[]
  pendingBills?: unknown[]
  payrollEmployees?: unknown[]
  payrollPayments?: unknown[]
  recentRevenues?: unknown[]
  recentExpenses?: unknown[]
  recentBills?: unknown[]
  recentEmployeePayments?: unknown[]
  recentTransfers?: unknown[]
} = {}) {
  prismaMock.account.findMany.mockResolvedValue(accounts)
  prismaMock.revenue.aggregate.mockResolvedValue(totalAmountAggregate(todayRevenue))
  prismaMock.expense.aggregate.mockResolvedValue(amountAggregate(todayExpense))
  prismaMock.bill.aggregate.mockResolvedValue(amountAggregate(todayBill))
  prismaMock.employeePayment.aggregate.mockResolvedValue(amountAggregate(todayEmployeePayment))
  prismaMock.transfer.aggregate.mockResolvedValue(amountAggregate(todayTransfer))
  prismaMock.revenue.findMany
    .mockResolvedValueOnce(pendingRevenues)
    .mockResolvedValueOnce(recentRevenues)
  prismaMock.expense.findMany
    .mockResolvedValueOnce(pendingExpenses)
    .mockResolvedValueOnce(recentExpenses)
  prismaMock.bill.findMany
    .mockResolvedValueOnce(pendingBills)
    .mockResolvedValueOnce(recentBills)
  prismaMock.employee.findMany.mockResolvedValue(payrollEmployees)
  prismaMock.employeePayment.findMany
    .mockResolvedValueOnce(payrollPayments)
    .mockResolvedValueOnce(recentEmployeePayments)
  prismaMock.transfer.findMany.mockResolvedValue(recentTransfers)
}

describe('DashboardService.live', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 26, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('soma o saldo total apenas das contas ativas retornadas pela consulta multi-tenant', async () => {
    setupLiveMocks({
      accounts: [
        { id: accountId, name: 'Sicredi', type: 'BANK', currentBalance: 1000, active: true },
        { id: secondAccountId, name: 'Caixa', type: 'CASH', currentBalance: 250, active: true },
      ],
    })

    const result = await DashboardService.live(companyId)

    expect(prismaMock.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId, deletedAt: null, active: true },
      }),
    )
    expect(result.position.totalBalance).toBe(1250)
    expect(result.position.balancesByAccount).toHaveLength(2)
  })

  it('calcula movimento de hoje sem incluir transferencias no movimento liquido', async () => {
    setupLiveMocks({
      todayRevenue: 1200,
      todayExpense: 300,
      todayBill: 200,
      todayEmployeePayment: 100,
      todayTransfer: 900,
    })

    const result = await DashboardService.live(companyId)

    expect(result.today.todayInflow).toBe(1200)
    expect(result.today.todayOutflow).toBe(600)
    expect(result.today.todayNetMovement).toBe(600)
    expect(result.today.todayTransfers).toBe(900)
  })

  it('usa receivedAt como previsao de receita pendente e date como fallback', async () => {
    setupLiveMocks({
      pendingRevenues: [
        {
          id: 'revenue-1',
          accountId,
          date: new Date(2026, 5, 26),
          receivedAt: new Date(2026, 5, 30),
          totalAmount: 500,
        },
        {
          id: 'revenue-2',
          accountId,
          date: new Date(2026, 5, 28),
          receivedAt: null,
          totalAmount: 250,
        },
        {
          id: 'revenue-3',
          accountId,
          date: new Date(2026, 5, 27),
          receivedAt: new Date(2026, 7, 27),
          totalAmount: 999,
        },
      ],
    })

    const result = await DashboardService.live(companyId)

    expect(result.commitments.receivablesNext7Days).toBe(750)
    expect(result.commitments.receivablesNext30Days).toBe(750)
    expect(result.projection.projectedByAccount7Days[0].projectedChange).toBe(750)
  })

  it('nao duplica valores pagos e inclui folha restante somente na projecao de 30 dias', async () => {
    setupLiveMocks({
      accounts: [{ id: accountId, name: 'Sicredi', type: 'BANK', currentBalance: 1000, active: true }],
      todayRevenue: 1000,
      todayExpense: 300,
      pendingRevenues: [
        { id: 'revenue-1', accountId, date: new Date(2026, 5, 28), receivedAt: null, totalAmount: 500 },
      ],
      pendingBills: [
        { id: 'bill-1', accountId, dueDate: new Date(2026, 5, 29), amount: 200 },
      ],
      payrollEmployees: [
        { id: 'employee-1', name: 'Joao', type: 'MONTHLY', baseSalary: 1000 },
      ],
      payrollPayments: [
        {
          employeeId: 'employee-1',
          type: 'ADVANCE',
          amount: 300,
          employee: { id: 'employee-1', name: 'Joao', type: 'MONTHLY', baseSalary: 1000 },
        },
      ],
    })

    const result = await DashboardService.live(companyId)

    expect(result.commitments.payrollRemainingCurrentMonth).toBe(700)
    expect(result.projection.projectedBalance7Days).toBe(1300)
    expect(result.projection.projectedBalance30Days).toBe(600)
  })

  it('gera alertas para vencidos e calcula vencimento por data, sem depender apenas do status', async () => {
    setupLiveMocks({
      pendingRevenues: [
        { id: 'revenue-1', accountId: null, date: new Date(2026, 5, 20), receivedAt: null, totalAmount: 400 },
      ],
      pendingExpenses: [
        { id: 'expense-1', accountId, date: new Date(2026, 5, 20), dueDate: null, amount: 300 },
      ],
      pendingBills: [
        { id: 'bill-1', accountId, dueDate: new Date(2026, 5, 21), amount: 200 },
      ],
    })

    const result = await DashboardService.live(companyId)

    expect(result.commitments.overdueReceivables).toBe(400)
    expect(result.commitments.overduePayables).toBe(500)
    expect(result.alerts.map((alert) => alert.type)).toEqual(
      expect.arrayContaining(['OVERDUE_RECEIVABLES', 'OVERDUE_PAYABLES']),
    )
  })

  it('mantem pendencias sem conta na projecao total e as retorna como nao alocadas', async () => {
    setupLiveMocks({
      accounts: [{ id: accountId, name: 'Sicredi', type: 'BANK', currentBalance: 1000, active: true }],
      pendingRevenues: [
        { id: 'revenue-1', accountId: null, date: new Date(2026, 5, 28), receivedAt: null, totalAmount: 500 },
      ],
      pendingBills: [
        { id: 'bill-1', accountId: null, dueDate: new Date(2026, 5, 29), amount: 800 },
      ],
    })

    const result = await DashboardService.live(companyId)

    expect(result.commitments.unassignedReceivables7Days).toBe(500)
    expect(result.commitments.unassignedPayables7Days).toBe(800)
    expect(result.projection.projectedBalance7Days).toBe(700)
    expect(result.projection.projectedByAccount7Days[0].projectedBalance).toBe(1000)
    expect(result.alerts.map((alert) => alert.type)).toContain('UNASSIGNED_COMMITMENTS')
  })

  it('inclui transferencias nos ultimos movimentos sem trata-las como entrada ou saida', async () => {
    setupLiveMocks({
      recentRevenues: [
        {
          id: 'revenue-1',
          date: new Date(2026, 5, 25),
          receivedAt: null,
          totalAmount: 100,
          client: null,
          notes: null,
          product: { name: 'Cafe' },
          account: { name: 'Sicredi' },
        },
      ],
      recentTransfers: [
        {
          id: 'transfer-1',
          date: new Date(2026, 5, 26),
          amount: 2000,
          description: 'Reforco de caixa',
          fromAccount: { name: 'Caixa' },
          toAccount: { name: 'Sicredi' },
        },
      ],
    })

    const result = await DashboardService.live(companyId)

    expect(result.recentMovements[0]).toEqual(
      expect.objectContaining({
        id: 'transfer-1',
        direction: 'TRANSFER',
        fromAccountName: 'Caixa',
        toAccountName: 'Sicredi',
      }),
    )
  })
})
