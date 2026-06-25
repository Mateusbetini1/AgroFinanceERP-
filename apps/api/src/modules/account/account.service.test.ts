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
