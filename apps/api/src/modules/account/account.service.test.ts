import type { Request } from 'express'
import { beforeEach, describe, expect, it } from 'vitest'
import { AccountService } from './account.service'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const companyId = 'company-1'
const accountId = 'account-1'

const account = {
  id: accountId,
  name: 'Conta Principal',
  type: 'BANK',
  bankName: null,
  agency: null,
  accountNumber: null,
  initialBalance: 1000,
  currentBalance: 1000,
  active: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

function mockRequest(): Request {
  return {} as Request
}

function mockExistingAccount() {
  prismaMock.account.findFirst.mockResolvedValue(account)
}

function mockEmptySummaryRelations() {
  prismaMock.revenue.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([])
  prismaMock.expense.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([])
  prismaMock.bill.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([])
  prismaMock.employeePayment.findMany.mockResolvedValue([])
  prismaMock.transfer.findMany.mockResolvedValue([])
}

function mockDependencyCounts(counts: {
  revenue?: number
  expense?: number
  bill?: number
  employeePayment?: number
  transferFrom?: number
  transferTo?: number
} = {}) {
  prismaMock.revenue.count.mockResolvedValue(counts.revenue ?? 0)
  prismaMock.expense.count.mockResolvedValue(counts.expense ?? 0)
  prismaMock.bill.count.mockResolvedValue(counts.bill ?? 0)
  prismaMock.employeePayment.count.mockResolvedValue(counts.employeePayment ?? 0)
  prismaMock.transfer.count
    .mockResolvedValueOnce(counts.transferFrom ?? 0)
    .mockResolvedValueOnce(counts.transferTo ?? 0)
}

async function expectDependencyConflict(
  counts: Parameters<typeof mockDependencyCounts>[0],
  expectedMessage: string,
) {
  mockExistingAccount()
  mockDependencyCounts(counts)

  await expect(AccountService.delete(companyId, accountId, mockRequest())).rejects.toMatchObject({
    statusCode: 409,
    code: 'CONFLICT',
    message: expect.stringContaining(expectedMessage),
  })

  expect(prismaMock.account.update).not.toHaveBeenCalled()
}

describe('AccountService.delete dependency checks', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('bloqueia com 409 se houver Revenue ativo vinculado', async () => {
    await expectDependencyConflict({ revenue: 1 }, '1 receita(s)')
  })

  it('bloqueia com 409 se houver Expense ativo vinculado', async () => {
    await expectDependencyConflict({ expense: 2 }, '2 despesa(s)')
  })

  it('bloqueia com 409 se houver Bill ativo vinculado', async () => {
    await expectDependencyConflict({ bill: 3 }, '3 boleto(s)')
  })

  it('bloqueia com 409 se houver EmployeePayment ativo vinculado', async () => {
    await expectDependencyConflict({ employeePayment: 4 }, '4 pagamento(s) de funcionario')
  })

  it('bloqueia com 409 se houver Transfer de origem ativo vinculado', async () => {
    await expectDependencyConflict({ transferFrom: 5 }, '5 transferencia(s) de origem')
  })

  it('bloqueia com 409 se houver Transfer de destino ativo vinculado', async () => {
    await expectDependencyConflict({ transferTo: 6 }, '6 transferencia(s) de destino')
  })

  it('faz soft delete quando nao ha dependencias', async () => {
    mockExistingAccount()
    mockDependencyCounts()
    prismaMock.account.update.mockResolvedValue({ ...account, active: false, deletedAt: new Date() })

    await AccountService.delete(companyId, accountId, mockRequest())

    expect(prismaMock.account.update).toHaveBeenCalledWith({
      where: { id: accountId },
      data: { deletedAt: expect.any(Date), active: false },
    })
  })
})

describe('AccountService.summary', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('retorna resumo somente da empresa atual e da conta informada sem alterar saldo ou status', async () => {
    mockExistingAccount()
    prismaMock.revenue.findMany
      .mockResolvedValueOnce([
        {
          id: 'pending-revenue-1',
          date: new Date('2026-07-20T12:00:00.000Z'),
          receivedAt: null,
          totalAmount: 900,
          status: 'PENDING',
          client: 'Cliente A',
          notes: null,
          product: { id: 'product-1', name: 'Tomate' },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'received-revenue-1',
          date: new Date('2026-07-10T12:00:00.000Z'),
          receivedAt: new Date('2026-07-11T12:00:00.000Z'),
          totalAmount: 1200,
          client: 'Cliente B',
          notes: null,
          product: { name: 'Pimentao' },
        },
      ])
    prismaMock.expense.findMany
      .mockResolvedValueOnce([
        {
          id: 'pending-expense-1',
          description: 'Energia',
          amount: 300,
          status: 'PENDING',
          date: new Date('2026-07-15T12:00:00.000Z'),
          dueDate: new Date('2026-07-18T12:00:00.000Z'),
          category: { id: 'category-1', name: 'Energia' },
          supplier: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'paid-expense-1',
          date: new Date('2026-07-05T12:00:00.000Z'),
          paidAt: new Date('2026-07-06T12:00:00.000Z'),
          description: 'Combustivel',
          amount: 150,
          category: { name: 'Combustivel' },
          supplier: { name: 'Posto' },
        },
      ])
    prismaMock.bill.findMany
      .mockResolvedValueOnce([
        {
          id: 'pending-bill-1',
          description: 'Boleto fornecedor',
          amount: 450,
          status: 'OVERDUE',
          dueDate: new Date('2026-07-13T12:00:00.000Z'),
          category: null,
          supplier: { id: 'supplier-1', name: 'Fornecedor' },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'paid-bill-1',
          dueDate: new Date('2026-07-02T12:00:00.000Z'),
          paidAt: new Date('2026-07-03T12:00:00.000Z'),
          description: 'Boleto pago',
          amount: 250,
          category: null,
          supplier: { name: 'Fornecedor' },
        },
      ])
    prismaMock.employeePayment.findMany.mockResolvedValue([
      {
        id: 'employee-payment-1',
        date: new Date('2026-07-07T12:00:00.000Z'),
        type: 'SALARY',
        amount: 500,
        notes: null,
        employee: { id: 'employee-1', name: 'Joao' },
      },
    ])
    prismaMock.transfer.findMany.mockResolvedValue([
      {
        id: 'transfer-out-1',
        date: new Date('2026-07-08T12:00:00.000Z'),
        amount: 200,
        description: null,
        fromAccountId: accountId,
        toAccountId: 'account-2',
        fromAccount: { id: accountId, name: 'Conta Principal' },
        toAccount: { id: 'account-2', name: 'Conta Destino' },
      },
      {
        id: 'transfer-in-1',
        date: new Date('2026-07-09T12:00:00.000Z'),
        amount: 350,
        description: 'Aporte',
        fromAccountId: 'account-3',
        toAccountId: accountId,
        fromAccount: { id: 'account-3', name: 'Conta Origem' },
        toAccount: { id: accountId, name: 'Conta Principal' },
      },
    ])

    const result = await AccountService.summary(companyId, accountId, { month: 7, year: 2026 })

    expect(prismaMock.account.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: accountId, companyId, deletedAt: null },
      }),
    )
    expect(prismaMock.revenue.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ companyId, accountId, status: 'PENDING', deletedAt: null }),
      }),
    )
    expect(prismaMock.revenue.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ companyId, accountId, status: 'RECEIVED', deletedAt: null }),
      }),
    )
    expect(prismaMock.expense.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ companyId, accountId, status: { in: ['PENDING', 'OVERDUE'] } }),
      }),
    )
    expect(prismaMock.expense.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ companyId, accountId, status: 'PAID', deletedAt: null }),
      }),
    )
    expect(prismaMock.bill.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ companyId, accountId, status: { in: ['PENDING', 'OVERDUE'] } }),
      }),
    )
    expect(prismaMock.bill.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ companyId, accountId, status: 'PAID', deletedAt: null }),
      }),
    )
    expect(prismaMock.employeePayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId, accountId, deletedAt: null }),
      }),
    )
    expect(prismaMock.transfer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId,
          deletedAt: null,
          OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
        }),
      }),
    )

    expect(result.totals).toEqual({
      inflows: 1550,
      outflows: 1100,
      net: 450,
      pendingInflows: 900,
      pendingOutflows: 750,
    })
    expect(result.pending.revenues.map((item) => item.id)).toEqual(['pending-revenue-1'])
    expect(result.pending.expenses.map((item) => item.id)).toEqual(['pending-expense-1'])
    expect(result.pending.bills.map((item) => item.id)).toEqual(['pending-bill-1'])
    expect(result.pending.employeePayments).toEqual([])
    expect(result.movements.map((movement) => movement.sourceType).sort()).toEqual([
      'BILL',
      'EMPLOYEE_PAYMENT',
      'EXPENSE',
      'REVENUE',
      'TRANSFER',
      'TRANSFER',
    ])
    expect(result.movements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ relatedId: 'received-revenue-1', direction: 'INFLOW', amount: 1200 }),
        expect.objectContaining({ relatedId: 'paid-expense-1', direction: 'OUTFLOW', amount: 150 }),
        expect.objectContaining({ relatedId: 'paid-bill-1', direction: 'OUTFLOW', amount: 250 }),
        expect.objectContaining({ relatedId: 'employee-payment-1', direction: 'OUTFLOW', amount: 500 }),
        expect.objectContaining({ relatedId: 'transfer-out-1', direction: 'OUTFLOW', amount: 200 }),
        expect.objectContaining({ relatedId: 'transfer-in-1', direction: 'INFLOW', amount: 350 }),
      ]),
    )
    expect(prismaMock.account.update).not.toHaveBeenCalled()
    expect(prismaMock.revenue.update).not.toHaveBeenCalled()
    expect(prismaMock.expense.update).not.toHaveBeenCalled()
    expect(prismaMock.bill.update).not.toHaveBeenCalled()
    expect(prismaMock.employeePayment.update).not.toHaveBeenCalled()
    expect(prismaMock.transfer.update).not.toHaveBeenCalled()
    expect(prismaMock.transaction.create).not.toHaveBeenCalled()
  })

  it('nao retorna dados quando a conta nao pertence a empresa atual', async () => {
    prismaMock.account.findFirst.mockResolvedValue(null)

    await expect(AccountService.summary(companyId, accountId, { month: 7, year: 2026 })).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    })

    expect(prismaMock.revenue.findMany).not.toHaveBeenCalled()
    expect(prismaMock.expense.findMany).not.toHaveBeenCalled()
    expect(prismaMock.bill.findMany).not.toHaveBeenCalled()
    expect(prismaMock.employeePayment.findMany).not.toHaveBeenCalled()
    expect(prismaMock.transfer.findMany).not.toHaveBeenCalled()
  })

  it('mantem itens sem accountId ou de outra conta fora do resumo por filtrar accountId', async () => {
    mockExistingAccount()
    mockEmptySummaryRelations()

    const result = await AccountService.summary(companyId, accountId, { month: 7, year: 2026 })

    expect(result.pending.revenues).toEqual([])
    expect(result.pending.expenses).toEqual([])
    expect(result.pending.bills).toEqual([])
    expect(result.movements).toEqual([])
    expect(prismaMock.revenue.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: expect.objectContaining({ accountId }) }),
    )
    expect(prismaMock.expense.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: expect.objectContaining({ accountId }) }),
    )
    expect(prismaMock.bill.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: expect.objectContaining({ accountId }) }),
    )
  })
})
