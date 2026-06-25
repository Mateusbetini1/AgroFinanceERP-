import type { Request } from 'express'
import { beforeEach, describe, expect, it } from 'vitest'
import { BillService } from './bill.service'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const companyId = 'company-1'
const req = {} as Request
const dueDate = new Date('2026-01-10T00:00:00.000Z')

function bill(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bill-1',
    billGroupId: null,
    supplierId: null,
    supplier: null,
    accountId: 'account-1',
    account: { id: 'account-1', name: 'Conta', type: 'BANK' },
    description: 'Boleto',
    amount: 100,
    dueDate,
    paidAt: null,
    status: 'PENDING',
    fileUrl: null,
    installmentNumber: null,
    installmentCount: null,
    createdAt: dueDate,
    updatedAt: dueDate,
    ...overrides,
  }
}

function mockAccount(id = 'account-1') {
  prismaMock.account.findFirst.mockResolvedValue({ id })
}

describe('BillService balance rules', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('create PAID com account debita saldo', async () => {
    mockAccount()
    prismaMock.bill.create.mockResolvedValue(bill({ status: 'PAID' }))

    await BillService.create(
      companyId,
      { accountId: 'account-1', description: 'Boleto', amount: 100, dueDate, status: 'PAID' },
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
    mockAccount()
    prismaMock.bill.create.mockResolvedValue(bill())

    await BillService.create(
      companyId,
      { accountId: 'account-1', description: 'Boleto', amount: 100, dueDate, status: 'PENDING' },
      req,
    )

    expect(prismaMock.account.update).not.toHaveBeenCalled()
  })

  it('update PENDING para PAID debita saldo', async () => {
    prismaMock.bill.findFirst.mockResolvedValue(bill())
    prismaMock.bill.update.mockResolvedValue(bill({ status: 'PAID' }))

    await BillService.update(companyId, 'bill-1', { status: 'PAID' }, req)

    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-1' },
        data: { currentBalance: { decrement: 100 } },
      }),
    )
  })

  it('update PAID para PENDING estorna saldo', async () => {
    prismaMock.bill.findFirst.mockResolvedValue(bill({ status: 'PAID' }))
    prismaMock.bill.update.mockResolvedValue(bill({ status: 'PENDING' }))

    await BillService.update(companyId, 'bill-1', { status: 'PENDING' }, req)

    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-1' },
        data: { currentBalance: { increment: 100 } },
      }),
    )
  })

  it('update PAID com mudanca de amount aplica diferenca', async () => {
    prismaMock.bill.findFirst.mockResolvedValue(bill({ status: 'PAID', amount: 150 }))
    prismaMock.bill.update.mockResolvedValue(bill({ status: 'PAID', amount: 100 }))

    await BillService.update(companyId, 'bill-1', { amount: 100 }, req)

    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-1' },
        data: { currentBalance: { increment: 50 } },
      }),
    )
  })

  it('update PAID com troca de account estorna antiga e debita nova', async () => {
    prismaMock.bill.findFirst.mockResolvedValue(bill({ status: 'PAID', accountId: 'account-old' }))
    prismaMock.account.findFirst.mockResolvedValue({ id: 'account-new' })
    prismaMock.bill.update.mockResolvedValue(bill({ status: 'PAID', accountId: 'account-new' }))

    await BillService.update(companyId, 'bill-1', { accountId: 'account-new' }, req)

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
    prismaMock.bill.findFirst.mockResolvedValue(bill({ status: 'PAID' }))
    prismaMock.bill.update.mockResolvedValue(bill({ status: 'PAID', deletedAt: new Date() }))

    await BillService.delete(companyId, 'bill-1', req)

    expect(prismaMock.bill.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bill-1' },
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
    prismaMock.account.findFirst.mockResolvedValue(null)

    await expect(
      BillService.create(
        companyId,
        { accountId: 'other-company-account', description: 'Boleto', amount: 100, dueDate, status: 'PAID' },
        req,
      ),
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(prismaMock.bill.create).not.toHaveBeenCalled()
    expect(prismaMock.account.update).not.toHaveBeenCalled()
  })
})
