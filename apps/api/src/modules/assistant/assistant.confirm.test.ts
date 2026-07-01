import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./assistant.tools', () => ({
  executeAssistantTool: vi.fn(),
  mergeSources: (sources: unknown[]) => sources,
}))

vi.mock('../expense/expense.service', () => ({
  ExpenseService: { create: vi.fn() },
}))

vi.mock('../bill/bill.service', () => ({
  BillService: { create: vi.fn(), createInstallments: vi.fn() },
}))

vi.mock('../employee-payment/employee-payment.service', () => ({
  EmployeePaymentService: { create: vi.fn() },
}))

vi.mock('../revenue/revenue.service', () => ({
  RevenueService: { create: vi.fn() },
}))

import { AssistantService } from './assistant.service'
import { ExpenseService } from '../expense/expense.service'
import { BillService } from '../bill/bill.service'
import { EmployeePaymentService } from '../employee-payment/employee-payment.service'
import { RevenueService } from '../revenue/revenue.service'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const req = {} as Parameters<typeof AssistantService.confirmDraft>[2]

describe('AssistantService.confirmDraft', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(ExpenseService.create).mockReset()
    vi.mocked(BillService.create).mockReset()
    vi.mocked(BillService.createInstallments).mockReset()
    vi.mocked(EmployeePaymentService.create).mockReset()
    vi.mocked(RevenueService.create).mockReset()
  })

  it('confirmacao cria despesa usando companyId correto', async () => {
    vi.mocked(ExpenseService.create).mockResolvedValue({ id: 'expense-1' })
    const payload = {
      description: 'Combustível',
      amount: 300,
      date: new Date('2026-07-01T00:00:00.000Z'),
      status: 'PENDING' as const,
      categoryId: '11111111-1111-4111-8111-111111111111',
    }

    await AssistantService.confirmDraft('company-1', {
      draft: { draftType: 'CREATE_EXPENSE', payload, missingFields: [], confirmationRequired: true },
    }, req)

    expect(ExpenseService.create).toHaveBeenCalledWith('company-1', payload, req)
  })

  it('confirmacao cria boleto usando companyId correto', async () => {
    vi.mocked(BillService.create).mockResolvedValue({ id: 'bill-1' })
    const payload = {
      description: 'Boleto',
      amount: 1200,
      dueDate: new Date('2026-07-10T00:00:00.000Z'),
      status: 'PENDING' as const,
    }

    await AssistantService.confirmDraft('company-1', {
      draft: { draftType: 'CREATE_BILL', payload, missingFields: [], confirmationRequired: true },
    }, req)

    expect(BillService.create).toHaveBeenCalledWith('company-1', payload, req)
  })

  it('confirmacao cria parcelamento usando companyId correto', async () => {
    vi.mocked(BillService.createInstallments).mockResolvedValue({ group: { id: 'group-1' }, bills: [] })
    const payload = {
      description: 'Compra parcelada',
      totalAmount: 4000,
      installmentCount: 4,
      firstDueDate: new Date('2026-07-10T00:00:00.000Z'),
      interval: 'MONTHLY' as const,
      supplierId: '55555555-5555-4555-8555-555555555555',
      categoryId: '11111111-1111-4111-8111-111111111111',
    }

    await AssistantService.confirmDraft('company-1', {
      draft: { draftType: 'CREATE_BILL_INSTALLMENT_GROUP', payload, missingFields: [], confirmationRequired: true },
    }, req)

    expect(BillService.createInstallments).toHaveBeenCalledWith('company-1', {
      categoryId: payload.categoryId,
      supplierId: payload.supplierId,
      accountId: undefined,
      safraId: undefined,
      description: payload.description,
      totalAmount: 4000,
      installmentCount: 4,
      firstDueDate: payload.firstDueDate,
    }, req)
  })

  it('confirmacao cria pagamento de funcionario usando companyId correto', async () => {
    vi.mocked(EmployeePaymentService.create).mockResolvedValue({ id: 'payment-1' })
    const payload = {
      employeeId: '22222222-2222-4222-8222-222222222222',
      accountId: '33333333-3333-4333-8333-333333333333',
      type: 'ADVANCE' as const,
      amount: 500,
      date: new Date('2026-07-01T00:00:00.000Z'),
      referenceMonth: 7,
      referenceYear: 2026,
      notes: 'Vale',
    }

    await AssistantService.confirmDraft('company-1', {
      draft: { draftType: 'CREATE_EMPLOYEE_PAYMENT', payload, missingFields: [], confirmationRequired: true },
    }, req)

    expect(EmployeePaymentService.create).toHaveBeenCalledWith('company-1', payload, req)
  })

  it('confirmacao cria receita usando companyId correto', async () => {
    vi.mocked(RevenueService.create).mockResolvedValue({ id: 'revenue-1' })
    prismaMock.product.count.mockResolvedValue(1)
    prismaMock.account.count.mockResolvedValue(1)

    const payload = {
      description: 'Venda de cafe',
      amount: 1750,
      quantity: 1,
      unitPrice: 1750,
      productId: '44444444-4444-4444-8444-444444444444',
      accountId: '33333333-3333-4333-8333-333333333333',
      date: new Date('2026-07-01T00:00:00.000Z'),
      receivedAt: new Date('2026-07-01T00:00:00.000Z'),
      status: 'RECEIVED' as const,
      notes: 'Venda de cafe',
    }

    await AssistantService.confirmDraft('company-1', {
      draft: { draftType: 'CREATE_REVENUE', payload, missingFields: [], confirmationRequired: true },
    }, req)

    expect(RevenueService.create).toHaveBeenCalledWith('company-1', {
      productId: payload.productId,
      accountId: payload.accountId,
      safraId: undefined,
      date: payload.date,
      receivedAt: payload.receivedAt,
      quantity: 1,
      unitPrice: 1750,
      client: undefined,
      notes: 'Venda de cafe',
      status: 'RECEIVED',
    }, req)
  })

  it('bloqueia confirmacao com campos faltantes', async () => {
    await expect(
      AssistantService.confirmDraft('company-1', {
        draft: {
          draftType: 'CREATE_EMPLOYEE_PAYMENT',
          payload: {
            employeeId: '22222222-2222-4222-8222-222222222222',
            type: 'ADVANCE',
            amount: 500,
            date: new Date('2026-07-01T00:00:00.000Z'),
            referenceMonth: 7,
            referenceYear: 2026,
          },
          missingFields: ['accountId'],
          confirmationRequired: true,
        },
      }, req),
    ).rejects.toMatchObject({ statusCode: 400 })

    expect(EmployeePaymentService.create).not.toHaveBeenCalled()
  })

  it('recalcula campos obrigatorios antes de confirmar', async () => {
    await expect(
      AssistantService.confirmDraft('company-1', {
        draft: {
          draftType: 'CREATE_EMPLOYEE_PAYMENT',
          payload: {
            employeeId: '22222222-2222-4222-8222-222222222222',
            type: 'ADVANCE',
            amount: 500,
            date: new Date('2026-07-01T00:00:00.000Z'),
            referenceMonth: 7,
            referenceYear: 2026,
          },
          missingFields: [],
          confirmationRequired: true,
        },
      }, req),
    ).rejects.toMatchObject({ statusCode: 400 })

    expect(EmployeePaymentService.create).not.toHaveBeenCalled()
  })

  it('nao confirma receita com campo obrigatorio faltante', async () => {
    await expect(
      AssistantService.confirmDraft('company-1', {
        draft: {
          draftType: 'CREATE_REVENUE',
          payload: {
            description: 'Venda',
            amount: 800,
            date: new Date('2026-07-01T00:00:00.000Z'),
            status: 'RECEIVED',
          },
          missingFields: [],
          confirmationRequired: true,
        },
      }, req),
    ).rejects.toMatchObject({ statusCode: 400 })

    expect(RevenueService.create).not.toHaveBeenCalled()
  })

  it('nao confirma parcelamento sem primeiro vencimento', async () => {
    await expect(
      AssistantService.confirmDraft('company-1', {
        draft: {
          draftType: 'CREATE_BILL_INSTALLMENT_GROUP',
          payload: {
            description: 'Compra parcelada',
            totalAmount: 4000,
            installmentCount: 4,
            interval: 'MONTHLY',
          },
          missingFields: [],
          confirmationRequired: true,
        },
      }, req),
    ).rejects.toMatchObject({ statusCode: 400 })

    expect(BillService.createInstallments).not.toHaveBeenCalled()
  })

  it('rejeita entidade de outra empresa antes de criar', async () => {
    prismaMock.category.count.mockResolvedValue(0)

    await expect(
      AssistantService.confirmDraft('company-1', {
        draft: {
          draftType: 'CREATE_EXPENSE',
          payload: {
            description: 'Combustivel',
            amount: 300,
            date: new Date('2026-07-01T00:00:00.000Z'),
            status: 'PENDING',
            categoryId: '11111111-1111-4111-8111-111111111111',
          },
          missingFields: [],
          confirmationRequired: true,
        },
      }, req),
    ).rejects.toMatchObject({ statusCode: 400 })

    expect(prismaMock.category.count).toHaveBeenCalledWith({
      where: { id: '11111111-1111-4111-8111-111111111111', companyId: 'company-1', deletedAt: null },
    })
    expect(ExpenseService.create).not.toHaveBeenCalled()
  })

  it('rejeita produto de outra empresa antes de criar receita', async () => {
    prismaMock.product.count.mockResolvedValue(0)

    await expect(
      AssistantService.confirmDraft('company-1', {
        draft: {
          draftType: 'CREATE_REVENUE',
          payload: {
            description: 'Venda de cafe',
            amount: 1750,
            productId: '44444444-4444-4444-8444-444444444444',
            date: new Date('2026-07-01T00:00:00.000Z'),
            status: 'PENDING',
          },
          missingFields: [],
          confirmationRequired: true,
        },
      }, req),
    ).rejects.toMatchObject({ statusCode: 400 })

    expect(RevenueService.create).not.toHaveBeenCalled()
  })
})
