import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./assistant.tools', () => ({
  executeAssistantTool: vi.fn(),
  mergeSources: (sources: unknown[]) => sources,
}))

vi.mock('../expense/expense.service', () => ({
  ExpenseService: { create: vi.fn() },
}))

vi.mock('../bill/bill.service', () => ({
  BillService: { create: vi.fn() },
}))

vi.mock('../employee-payment/employee-payment.service', () => ({
  EmployeePaymentService: { create: vi.fn() },
}))

import { AssistantService } from './assistant.service'
import { ExpenseService } from '../expense/expense.service'
import { BillService } from '../bill/bill.service'
import { EmployeePaymentService } from '../employee-payment/employee-payment.service'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const req = {} as Parameters<typeof AssistantService.confirmDraft>[2]

describe('AssistantService.confirmDraft', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(ExpenseService.create).mockReset()
    vi.mocked(BillService.create).mockReset()
    vi.mocked(EmployeePaymentService.create).mockReset()
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
})
