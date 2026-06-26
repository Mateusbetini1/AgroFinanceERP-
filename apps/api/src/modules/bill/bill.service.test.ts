import type { Request } from 'express'
import { beforeEach, describe, expect, it } from 'vitest'
import { BillService } from './bill.service'
import { createBillInstallmentsSchema } from './bill.schemas'
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

function mockSupplier(id = 'supplier-1') {
  prismaMock.supplier.findFirst.mockResolvedValue({ id })
}

function mockBillGroup(overrides: Record<string, unknown> = {}) {
  return {
    id: 'group-1',
    companyId,
    supplierId: null,
    description: 'Compra parcelada',
    totalAmount: 1000,
    installmentCount: 3,
    createdAt: dueDate,
    updatedAt: dueDate,
    ...overrides,
  }
}

function mockInstallmentCreates() {
  prismaMock.bill.create.mockImplementation(async (args: { data: Record<string, unknown> }) =>
    bill({
      id: `bill-${args.data.installmentNumber}`,
      billGroupId: args.data.billGroupId,
      supplierId: args.data.supplierId ?? null,
      accountId: args.data.accountId ?? null,
      description: args.data.description,
      amount: args.data.amount,
      dueDate: args.data.dueDate,
      status: args.data.status,
      fileUrl: args.data.fileUrl ?? null,
      installmentNumber: args.data.installmentNumber,
      installmentCount: args.data.installmentCount,
    }),
  )
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

describe('BillService installment rules', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('cria BillGroup e N Bills PENDING sem alterar saldo', async () => {
    mockSupplier()
    mockAccount()
    prismaMock.billGroup.create.mockResolvedValue(mockBillGroup({ supplierId: 'supplier-1', installmentCount: 4 }))
    mockInstallmentCreates()

    const result = await BillService.createInstallments(
      companyId,
      {
        supplierId: 'supplier-1',
        accountId: 'account-1',
        description: 'Compra parcelada',
        totalAmount: 2000,
        installmentCount: 4,
        firstDueDate: new Date(2026, 0, 10, 12),
      },
      req,
    )

    expect(prismaMock.billGroup.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId,
          supplierId: 'supplier-1',
          description: 'Compra parcelada',
          totalAmount: 2000,
          installmentCount: 4,
        }),
      }),
    )
    expect(prismaMock.bill.create).toHaveBeenCalledTimes(4)
    expect(result.bills).toHaveLength(4)
    expect(result.bills.every((created) => created.status === 'PENDING')).toBe(true)
    expect(prismaMock.account.update).not.toHaveBeenCalled()
  })

  it('distribui centavos colocando a diferenca na ultima parcela', async () => {
    prismaMock.billGroup.create.mockResolvedValue(mockBillGroup())
    mockInstallmentCreates()

    await BillService.createInstallments(
      companyId,
      {
        description: 'Compra parcelada',
        totalAmount: 1000,
        installmentCount: 3,
        firstDueDate: new Date(2026, 0, 10, 12),
      },
      req,
    )

    expect(prismaMock.bill.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ data: expect.objectContaining({ amount: 333.33 }) }),
    )
    expect(prismaMock.bill.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ data: expect.objectContaining({ amount: 333.33 }) }),
    )
    expect(prismaMock.bill.create).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ data: expect.objectContaining({ amount: 333.34 }) }),
    )
  })

  it('calcula vencimentos mensais com dia 31 caindo no ultimo dia do mes', async () => {
    prismaMock.billGroup.create.mockResolvedValue(mockBillGroup({ installmentCount: 4 }))
    mockInstallmentCreates()

    await BillService.createInstallments(
      companyId,
      {
        description: 'Compra parcelada',
        totalAmount: 400,
        installmentCount: 4,
        firstDueDate: new Date(2026, 0, 31, 12),
      },
      req,
    )

    const dueDates = prismaMock.bill.create.mock.calls.map((call) => call[0].data.dueDate as Date)
    expect(dueDates.map((date) => date.getDate())).toEqual([31, 28, 31, 30])
    expect(dueDates.map((date) => date.getMonth())).toEqual([0, 1, 2, 3])
  })

  it('valida totalAmount maior que zero e installmentCount minimo', () => {
    const result = createBillInstallmentsSchema.safeParse({
      description: 'Compra parcelada',
      totalAmount: 0,
      installmentCount: 1,
      firstDueDate: new Date(2026, 0, 10, 12),
    })

    expect(result.success).toBe(false)
  })

  it('supplierId cross-company/inexistente retorna not found', async () => {
    prismaMock.supplier.findFirst.mockResolvedValue(null)

    await expect(
      BillService.createInstallments(
        companyId,
        {
          supplierId: 'supplier-other-company',
          description: 'Compra parcelada',
          totalAmount: 1000,
          installmentCount: 3,
          firstDueDate: new Date(2026, 0, 10, 12),
        },
        req,
      ),
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(prismaMock.billGroup.create).not.toHaveBeenCalled()
    expect(prismaMock.bill.create).not.toHaveBeenCalled()
  })

  it('accountId cross-company/inexistente retorna not found', async () => {
    prismaMock.account.findFirst.mockResolvedValue(null)

    await expect(
      BillService.createInstallments(
        companyId,
        {
          accountId: 'account-other-company',
          description: 'Compra parcelada',
          totalAmount: 1000,
          installmentCount: 3,
          firstDueDate: new Date(2026, 0, 10, 12),
        },
        req,
      ),
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(prismaMock.billGroup.create).not.toHaveBeenCalled()
    expect(prismaMock.bill.create).not.toHaveBeenCalled()
  })

  it('usa transaction para evitar grupo orfao em falha de criacao das parcelas', async () => {
    prismaMock.billGroup.create.mockResolvedValue(mockBillGroup())
    prismaMock.bill.create.mockRejectedValue(new Error('create failed'))

    await expect(
      BillService.createInstallments(
        companyId,
        {
          description: 'Compra parcelada',
          totalAmount: 1000,
          installmentCount: 3,
          firstDueDate: new Date(2026, 0, 10, 12),
        },
        req,
      ),
    ).rejects.toThrow('create failed')

    expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function))
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled()
  })
})
