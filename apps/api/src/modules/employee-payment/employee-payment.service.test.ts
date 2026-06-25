import type { Request } from 'express'
import { beforeEach, describe, expect, it } from 'vitest'
import { EmployeePaymentService } from './employee-payment.service'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const companyId = 'company-1'
const req = {} as Request
const date = new Date('2026-01-10T00:00:00.000Z')

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'payment-1',
    employeeId: 'employee-1',
    employee: { id: 'employee-1', name: 'Funcionario', role: 'Operador', status: 'ACTIVE' },
    accountId: 'account-1',
    account: { id: 'account-1', name: 'Conta', type: 'BANK' },
    type: 'SALARY',
    amount: 100,
    date,
    referenceMonth: 1,
    referenceYear: 2026,
    notes: null,
    createdAt: date,
    updatedAt: date,
    ...overrides,
  }
}

function mockEmployee() {
  prismaMock.employee.findFirst.mockResolvedValue({ id: 'employee-1' })
}

function mockAccount(id = 'account-1') {
  prismaMock.account.findFirst.mockResolvedValue({ id })
}

describe('EmployeePaymentService balance rules', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('create com account debita saldo', async () => {
    mockEmployee()
    mockAccount()
    prismaMock.employeePayment.create.mockResolvedValue(payment())

    await EmployeePaymentService.create(
      companyId,
      { employeeId: 'employee-1', accountId: 'account-1', type: 'SALARY', amount: 100, date, referenceMonth: 1, referenceYear: 2026 },
      req,
    )

    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-1' },
        data: { currentBalance: { decrement: 100 } },
      }),
    )
  })

  it('create sem account nao altera saldo', async () => {
    mockEmployee()
    prismaMock.employeePayment.create.mockResolvedValue(payment({ accountId: null, account: null }))

    await EmployeePaymentService.create(
      companyId,
      { employeeId: 'employee-1', type: 'SALARY', amount: 100, date, referenceMonth: 1, referenceYear: 2026 },
      req,
    )

    expect(prismaMock.account.update).not.toHaveBeenCalled()
  })

  it('update com mudanca de amount aplica diferenca', async () => {
    prismaMock.employeePayment.findFirst.mockResolvedValue(payment({ amount: 150 }))
    prismaMock.employeePayment.update.mockResolvedValue(payment({ amount: 100 }))

    await EmployeePaymentService.update(companyId, 'payment-1', { amount: 100 }, req)

    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-1' },
        data: { currentBalance: { increment: 50 } },
      }),
    )
  })

  it('update com troca de account estorna antiga e debita nova', async () => {
    prismaMock.employeePayment.findFirst.mockResolvedValue(payment({ accountId: 'account-old' }))
    prismaMock.account.findFirst.mockResolvedValue({ id: 'account-new' })
    prismaMock.employeePayment.update.mockResolvedValue(payment({ accountId: 'account-new' }))

    await EmployeePaymentService.update(companyId, 'payment-1', { accountId: 'account-new' }, req)

    expect(prismaMock.account.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'account-old' }, data: { currentBalance: { increment: 100 } } }))
    expect(prismaMock.account.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'account-new' }, data: { currentBalance: { decrement: 100 } } }))
  })

  it('update removendo accountId estorna conta antiga', async () => {
    prismaMock.employeePayment.findFirst.mockResolvedValue(payment())
    prismaMock.employeePayment.update.mockResolvedValue(payment({ accountId: null, account: null }))

    await EmployeePaymentService.update(companyId, 'payment-1', { accountId: null }, req)

    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-1' },
        data: { currentBalance: { increment: 100 } },
      }),
    )
  })

  it('update adicionando accountId debita nova conta', async () => {
    prismaMock.employeePayment.findFirst.mockResolvedValue(payment({ accountId: null, account: null }))
    prismaMock.account.findFirst.mockResolvedValue({ id: 'account-new' })
    prismaMock.employeePayment.update.mockResolvedValue(payment({ accountId: 'account-new' }))

    await EmployeePaymentService.update(companyId, 'payment-1', { accountId: 'account-new' }, req)

    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-new' },
        data: { currentBalance: { decrement: 100 } },
      }),
    )
  })

  it('delete estorna saldo e faz soft delete', async () => {
    prismaMock.employeePayment.findFirst.mockResolvedValue(payment())
    prismaMock.employeePayment.update.mockResolvedValue(payment({ deletedAt: new Date() }))

    await EmployeePaymentService.delete(companyId, 'payment-1', req)

    expect(prismaMock.employeePayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'payment-1' },
        data: { deletedAt: expect.any(Date) },
      }),
    )
    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-1' },
        data: { currentBalance: { increment: 100 } },
      }),
    )
  })

  it('employee inativo ou cross-company retorna not found', async () => {
    prismaMock.employee.findFirst.mockResolvedValue(null)

    await expect(
      EmployeePaymentService.create(
        companyId,
        { employeeId: 'inactive-or-cross-company', accountId: 'account-1', type: 'SALARY', amount: 100, date, referenceMonth: 1, referenceYear: 2026 },
        req,
      ),
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(prismaMock.employeePayment.create).not.toHaveBeenCalled()
    expect(prismaMock.account.update).not.toHaveBeenCalled()
  })
})
