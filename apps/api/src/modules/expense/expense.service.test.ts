import type { Request } from 'express'
import { beforeEach, describe, expect, it } from 'vitest'
import { ExpenseService } from './expense.service'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const companyId = 'company-1'
const req = {} as Request
const date = new Date('2026-01-10T00:00:00.000Z')

function expense(overrides: Record<string, unknown> = {}) {
  return {
    id: 'expense-1',
    categoryId: 'category-1',
    category: { id: 'category-1', name: 'Insumos', type: 'EXPENSE' },
    supplierId: null,
    supplier: null,
    accountId: 'account-1',
    account: { id: 'account-1', name: 'Conta', type: 'BANK' },
    safraId: null,
    date,
    dueDate: null,
    paidAt: null,
    amount: 100,
    description: 'Compra',
    status: 'PENDING',
    attachmentUrl: null,
    createdAt: date,
    updatedAt: date,
    ...overrides,
  }
}

function mockCategory() {
  prismaMock.category.findFirst.mockResolvedValue({ id: 'category-1' })
}

function mockAccount(id = 'account-1') {
  prismaMock.account.findFirst.mockResolvedValue({ id })
}

describe('ExpenseService balance rules', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('create PAID com account debita saldo', async () => {
    mockCategory()
    mockAccount()
    prismaMock.expense.create.mockResolvedValue(expense({ status: 'PAID' }))

    await ExpenseService.create(
      companyId,
      { categoryId: 'category-1', accountId: 'account-1', date, amount: 100, description: 'Compra', status: 'PAID' },
      req,
    )

    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-1' },
        data: { currentBalance: { decrement: 100 } },
      }),
    )
  })

  it('create PENDING nao altera saldo', async () => {
    mockCategory()
    mockAccount()
    prismaMock.expense.create.mockResolvedValue(expense())

    await ExpenseService.create(
      companyId,
      { categoryId: 'category-1', accountId: 'account-1', date, amount: 100, description: 'Compra', status: 'PENDING' },
      req,
    )

    expect(prismaMock.account.update).not.toHaveBeenCalled()
  })

  it('update PENDING para PAID debita saldo', async () => {
    prismaMock.expense.findFirst.mockResolvedValue(expense())
    prismaMock.expense.update.mockResolvedValue(expense({ status: 'PAID' }))

    await ExpenseService.update(companyId, 'expense-1', { status: 'PAID' }, req)

    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-1' },
        data: { currentBalance: { decrement: 100 } },
      }),
    )
  })

  it('update PAID para PENDING estorna saldo', async () => {
    prismaMock.expense.findFirst.mockResolvedValue(expense({ status: 'PAID' }))
    prismaMock.expense.update.mockResolvedValue(expense({ status: 'PENDING' }))

    await ExpenseService.update(companyId, 'expense-1', { status: 'PENDING' }, req)

    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-1' },
        data: { currentBalance: { increment: 100 } },
      }),
    )
  })

  it('update PAID com mudanca de amount aplica diferenca', async () => {
    prismaMock.expense.findFirst.mockResolvedValue(expense({ status: 'PAID', amount: 150 }))
    prismaMock.expense.update.mockResolvedValue(expense({ status: 'PAID', amount: 100 }))

    await ExpenseService.update(companyId, 'expense-1', { amount: 100 }, req)

    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-1' },
        data: { currentBalance: { increment: 50 } },
      }),
    )
  })

  it('update PAID com troca de account estorna antiga e debita nova', async () => {
    prismaMock.expense.findFirst.mockResolvedValue(expense({ status: 'PAID', accountId: 'account-old' }))
    prismaMock.account.findFirst.mockResolvedValue({ id: 'account-new' })
    prismaMock.expense.update.mockResolvedValue(expense({ status: 'PAID', accountId: 'account-new' }))

    await ExpenseService.update(companyId, 'expense-1', { accountId: 'account-new' }, req)

    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-old' },
        data: { currentBalance: { increment: 100 } },
      }),
    )
    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-new' },
        data: { currentBalance: { decrement: 100 } },
      }),
    )
  })

  it('delete PAID estorna saldo e faz soft delete', async () => {
    prismaMock.expense.findFirst.mockResolvedValue(expense({ status: 'PAID' }))
    prismaMock.expense.update.mockResolvedValue(expense({ status: 'PAID', deletedAt: new Date() }))

    await ExpenseService.delete(companyId, 'expense-1', req)

    expect(prismaMock.expense.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'expense-1' },
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

  it('FK/cross-company invalida retorna not found', async () => {
    prismaMock.category.findFirst.mockResolvedValue(null)

    await expect(
      ExpenseService.create(
        companyId,
        { categoryId: 'other-company-category', accountId: 'account-1', date, amount: 100, description: 'Compra', status: 'PAID' },
        req,
      ),
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(prismaMock.expense.create).not.toHaveBeenCalled()
    expect(prismaMock.account.update).not.toHaveBeenCalled()
  })
})
