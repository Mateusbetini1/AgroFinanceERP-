import type { Request } from 'express'
import { beforeEach, describe, expect, it } from 'vitest'
import { BillService } from './bill.service'
import { createBillInstallmentsSchema, createRecurringBillsSchema } from './bill.schemas'
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

function billGroupWithBills(overrides: Record<string, unknown> = {}) {
  return {
    ...mockBillGroup({ totalAmount: 2000, installmentCount: 4 }),
    supplier: { id: 'supplier-1', name: 'Casa Agricola' },
    bills: [
      bill({
        id: 'bill-1',
        billGroupId: 'group-1',
        supplierId: 'supplier-1',
        supplier: { id: 'supplier-1', name: 'Casa Agricola' },
        amount: 500,
        status: 'PAID',
        paidAt: new Date('2026-07-10T00:00:00.000Z'),
        dueDate: new Date('2026-07-10T00:00:00.000Z'),
        installmentNumber: 1,
        installmentCount: 4,
      }),
      bill({
        id: 'bill-2',
        billGroupId: 'group-1',
        supplierId: 'supplier-1',
        supplier: { id: 'supplier-1', name: 'Casa Agricola' },
        amount: 500,
        dueDate: new Date('2099-08-10T00:00:00.000Z'),
        installmentNumber: 2,
        installmentCount: 4,
      }),
      bill({
        id: 'bill-3',
        billGroupId: 'group-1',
        supplierId: 'supplier-1',
        supplier: { id: 'supplier-1', name: 'Casa Agricola' },
        amount: 500,
        dueDate: new Date('2099-09-10T00:00:00.000Z'),
        installmentNumber: 3,
        installmentCount: 4,
      }),
    ],
    ...overrides,
  }
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

describe('BillService bill group read model', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('lista apenas grupos da empresa com parcelas ativas e calcula resumo financeiro', async () => {
    prismaMock.billGroup.findMany.mockResolvedValue([billGroupWithBills()])

    const result = await BillService.listGroups(companyId, { page: 1, limit: 20 })

    expect(prismaMock.billGroup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId,
          bills: { some: { companyId, deletedAt: null } },
        }),
      }),
    )
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toMatchObject({
      totalAmount: 2000,
      activeTotalAmount: 1500,
      paidAmount: 500,
      pendingAmount: 1000,
      activeInstallments: 3,
      paidInstallments: 1,
      pendingInstallments: 2,
      overdueInstallments: 0,
      deletedInstallments: 1,
      status: 'IN_PROGRESS',
    })
    expect(result.data[0].nextDueDate).toEqual(new Date('2099-08-10T00:00:00.000Z'))
  })

  it('filtra status derivado e remove grupos sem parcelas ativas', async () => {
    prismaMock.billGroup.findMany.mockResolvedValue([
      billGroupWithBills({ id: 'group-paid', bills: [bill({ status: 'PAID', amount: 100 })] }),
      billGroupWithBills({ id: 'group-empty', bills: [] }),
    ])

    const result = await BillService.listGroups(companyId, { page: 1, limit: 20, status: 'PAID' })

    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe('group-paid')
    expect(result.meta.total).toBe(1)
  })

  it('calcula status PENDING quando nenhuma parcela foi paga', async () => {
    prismaMock.billGroup.findMany.mockResolvedValue([
      billGroupWithBills({
        bills: [
          bill({ id: 'bill-1', amount: 100, dueDate: new Date('2099-01-10T00:00:00.000Z') }),
          bill({ id: 'bill-2', amount: 100, dueDate: new Date('2099-02-10T00:00:00.000Z') }),
        ],
      }),
    ])

    const result = await BillService.listGroups(companyId, { page: 1, limit: 20 })

    expect(result.data[0].status).toBe('PENDING')
  })

  it('calcula status OVERDUE por status salvo e por PENDING vencido', async () => {
    prismaMock.billGroup.findMany.mockResolvedValue([
      billGroupWithBills({
        id: 'group-overdue-status',
        bills: [bill({ id: 'bill-1', status: 'OVERDUE', dueDate: new Date('2099-01-10T00:00:00.000Z') })],
      }),
      billGroupWithBills({
        id: 'group-overdue-date',
        bills: [bill({ id: 'bill-2', status: 'PENDING', dueDate: new Date('2020-01-10T00:00:00.000Z') })],
      }),
    ])

    const result = await BillService.listGroups(companyId, { page: 1, limit: 20 })

    expect(result.data.map((group) => group.status)).toEqual(['OVERDUE', 'OVERDUE'])
    expect(result.data.map((group) => group.overdueInstallments)).toEqual([1, 1])
  })

  it('detalha parcelas ativas ordenadas por numero da parcela e vencimento', async () => {
    prismaMock.billGroup.findFirst.mockResolvedValue(
      billGroupWithBills({
        bills: [
          bill({ id: 'bill-3', installmentNumber: 3, dueDate: new Date('2099-03-10T00:00:00.000Z') }),
          bill({ id: 'bill-1', installmentNumber: 1, dueDate: new Date('2099-01-10T00:00:00.000Z') }),
          bill({ id: 'bill-2', installmentNumber: 2, dueDate: new Date('2099-02-10T00:00:00.000Z') }),
        ],
      }),
    )

    const result = await BillService.findGroupById(companyId, 'group-1')

    expect(prismaMock.billGroup.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'group-1',
          companyId,
          bills: { some: { companyId, deletedAt: null } },
        },
      }),
    )
    expect(result.installments.map((installment) => installment.id)).toEqual(['bill-1', 'bill-2', 'bill-3'])
  })

  it('nao retorna boletos avulsos e nao altera saldo nos endpoints de leitura', async () => {
    prismaMock.billGroup.findMany.mockResolvedValue([billGroupWithBills()])

    await BillService.listGroups(companyId, { page: 1, limit: 20 })

    expect(prismaMock.bill.findMany).not.toHaveBeenCalled()
    expect(prismaMock.account.update).not.toHaveBeenCalled()
  })

  it('retorna not found para grupo sem parcelas ativas', async () => {
    prismaMock.billGroup.findFirst.mockResolvedValue(billGroupWithBills({ bills: [] }))

    await expect(BillService.findGroupById(companyId, 'group-1')).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('BillService recurring bill generator', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  function mockRecurringCreates() {
    prismaMock.bill.create.mockImplementation(async (args: { data: Record<string, unknown> }) =>
      bill({
        id: `bill-${(prismaMock.bill.create.mock.calls.length || 1).toString()}`,
        billGroupId: null,
        supplierId: args.data.supplierId ?? null,
        accountId: args.data.accountId ?? null,
        description: args.data.description,
        amount: args.data.amount,
        dueDate: args.data.dueDate,
        status: args.data.status,
        installmentNumber: args.data.installmentNumber ?? null,
        installmentCount: args.data.installmentCount ?? null,
      }),
    )
  }

  it('gera N Bills PENDING sem alterar saldo, BillGroup ou Expense', async () => {
    mockSupplier()
    mockAccount()
    prismaMock.bill.findFirst.mockResolvedValue(null)
    mockRecurringCreates()

    const result = await BillService.createRecurringBills(
      companyId,
      {
        supplierId: 'supplier-1',
        accountId: 'account-1',
        description: 'Energia eletrica',
        amount: 700,
        firstDueDate: new Date('2026-07-15T12:00:00.000Z'),
        months: 3,
        skipExisting: true,
      },
      req,
    )

    expect(prismaMock.supplier.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'supplier-1', companyId, deletedAt: null } }),
    )
    expect(prismaMock.account.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'account-1', companyId, deletedAt: null, active: true } }),
    )
    expect(prismaMock.bill.create).toHaveBeenCalledTimes(3)
    expect(result.countCreated).toBe(3)
    expect(result.countSkipped).toBe(0)
    expect(result.created.every((created) => created.status === 'PENDING')).toBe(true)
    expect(prismaMock.account.update).not.toHaveBeenCalled()
    expect(prismaMock.billGroup.create).not.toHaveBeenCalled()
    expect(prismaMock.expense.create).not.toHaveBeenCalled()
  })

  it('usa companyId e cria boletos avulsos sem dados de parcelamento', async () => {
    prismaMock.bill.findFirst.mockResolvedValue(null)
    mockRecurringCreates()

    await BillService.createRecurringBills(
      companyId,
      {
        description: 'Internet',
        amount: 150,
        firstDueDate: new Date('2026-07-10T12:00:00.000Z'),
        months: 1,
        skipExisting: true,
      },
      req,
    )

    expect(prismaMock.bill.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId,
          billGroupId: null,
          installmentNumber: null,
          installmentCount: null,
          status: 'PENDING',
        }),
      }),
    )
  })

  it('calcula vencimentos mensais e trata dia 31 no ultimo dia do mes', async () => {
    prismaMock.bill.findFirst.mockResolvedValue(null)
    mockRecurringCreates()

    await BillService.createRecurringBills(
      companyId,
      {
        description: 'Aluguel',
        amount: 1000,
        firstDueDate: new Date('2026-01-31T12:00:00.000Z'),
        months: 4,
        skipExisting: true,
      },
      req,
    )

    const dueDates = prismaMock.bill.create.mock.calls.map((call) => call[0].data.dueDate as Date)
    expect(dueDates.map((date) => date.getUTCDate())).toEqual([31, 28, 31, 30])
    expect(dueDates.map((date) => date.getUTCMonth())).toEqual([0, 1, 2, 3])
  })

  it('nao cria duplicados quando skipExisting e retorna skipped', async () => {
    prismaMock.bill.findFirst
      .mockResolvedValueOnce({ id: 'existing-bill-1' })
      .mockResolvedValueOnce(null)
    mockRecurringCreates()

    const result = await BillService.createRecurringBills(
      companyId,
      {
        description: 'Seguro',
        amount: 300,
        firstDueDate: new Date('2026-07-10T12:00:00.000Z'),
        months: 2,
        skipExisting: true,
      },
      req,
    )

    expect(prismaMock.bill.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId,
          deletedAt: null,
          billGroupId: null,
          description: 'Seguro',
          supplierId: null,
          accountId: null,
          amount: 300,
          status: { in: ['PENDING', 'OVERDUE'] },
        }),
      }),
    )
    expect(prismaMock.bill.create).toHaveBeenCalledTimes(1)
    expect(result.countCreated).toBe(1)
    expect(result.countSkipped).toBe(1)
    expect(result.skipped[0]).toMatchObject({
      reason: 'DUPLICATE',
      existingBillId: 'existing-bill-1',
    })
  })

  it('permite gerar duplicados quando skipExisting e false', async () => {
    mockRecurringCreates()

    const result = await BillService.createRecurringBills(
      companyId,
      {
        description: 'Sistema',
        amount: 99,
        firstDueDate: new Date('2026-07-10T12:00:00.000Z'),
        months: 2,
        skipExisting: false,
      },
      req,
    )

    expect(prismaMock.bill.findFirst).not.toHaveBeenCalled()
    expect(prismaMock.bill.create).toHaveBeenCalledTimes(2)
    expect(result.countCreated).toBe(2)
  })

  it('valida fornecedor e conta da empresa', async () => {
    prismaMock.supplier.findFirst.mockResolvedValue(null)

    await expect(
      BillService.createRecurringBills(
        companyId,
        {
          supplierId: 'supplier-other-company',
          description: 'Contador',
          amount: 500,
          firstDueDate: new Date('2026-07-10T12:00:00.000Z'),
          months: 1,
          skipExisting: true,
        },
        req,
      ),
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(prismaMock.bill.create).not.toHaveBeenCalled()

    resetPrismaMock()
    prismaMock.account.findFirst.mockResolvedValue(null)

    await expect(
      BillService.createRecurringBills(
        companyId,
        {
          accountId: 'account-other-company',
          description: 'Contador',
          amount: 500,
          firstDueDate: new Date('2026-07-10T12:00:00.000Z'),
          months: 1,
          skipExisting: true,
        },
        req,
      ),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('falha com months invalido e amount menor ou igual a zero', () => {
    expect(
      createRecurringBillsSchema.safeParse({
        description: 'Energia',
        amount: 0,
        firstDueDate: new Date('2026-07-10T12:00:00.000Z'),
        months: 12,
      }).success,
    ).toBe(false)

    expect(
      createRecurringBillsSchema.safeParse({
        description: 'Energia',
        amount: 100,
        firstDueDate: new Date('2026-07-10T12:00:00.000Z'),
        months: 25,
      }).success,
    ).toBe(false)
  })

  it('usa transaction para evitar criacao parcial em erro inesperado', async () => {
    prismaMock.bill.findFirst.mockResolvedValue(null)
    prismaMock.bill.create.mockRejectedValue(new Error('create failed'))

    await expect(
      BillService.createRecurringBills(
        companyId,
        {
          description: 'Energia',
          amount: 100,
          firstDueDate: new Date('2026-07-10T12:00:00.000Z'),
          months: 2,
          skipExisting: true,
        },
        req,
      ),
    ).rejects.toThrow('create failed')

    expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function))
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled()
  })
})
