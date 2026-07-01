import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { env } from '../../config/env'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

vi.mock('./assistant.tools', () => ({
  executeAssistantTool: vi.fn(),
  mergeSources: (sources: unknown[]) => sources,
}))

import { AssistantService } from './assistant.service'
import { executeAssistantTool } from './assistant.tools'
import type { AssistantToolCall } from './assistant.schemas'

const originalEnv = {
  AI_ENABLED: env.AI_ENABLED,
  AI_API_KEY: env.AI_API_KEY,
  AI_MODEL: env.AI_MODEL,
  AI_TIMEOUT_MS: env.AI_TIMEOUT_MS,
}

function mockToolData(data: unknown, sources = [{ label: 'Fonte', route: '/test' }]) {
  vi.mocked(executeAssistantTool).mockResolvedValue({ data, sources })
}

function expectTool(companyId: string, tool: AssistantToolCall['tool']) {
  expect(executeAssistantTool).toHaveBeenCalledWith(companyId, expect.objectContaining({ tool }))
}

describe('AssistantService.chat', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    resetPrismaMock()
    ;(env as typeof env).AI_ENABLED = true
    ;(env as typeof env).AI_API_KEY = 'test-ai-key'
    ;(env as typeof env).AI_MODEL = 'gemini-test'
    ;(env as typeof env).AI_TIMEOUT_MS = 5000
    vi.mocked(executeAssistantTool).mockReset()
    mockToolData({ count: 0, total: 0 })
  })

  it('retorna erro amigavel quando a IA nao esta configurada', async () => {
    ;(env as typeof env).AI_ENABLED = false
    ;(env as typeof env).AI_API_KEY = undefined

    const result = await AssistantService.chat('company-1', { message: 'Tenho boletos vencidos?' })

    expect(result.kind).toBe('ERROR')
    expect(result.answer).toContain('assistente ainda')
    expect(executeAssistantTool).not.toHaveBeenCalled()
  })

  it('chat gera CREATE_EXPENSE_DRAFT sem salvar', async () => {
    prismaMock.category.findMany.mockResolvedValue([{ id: '11111111-1111-4111-8111-111111111111', name: 'Combustível' }])

    const result = await AssistantService.chat('company-1', { message: 'Lance uma despesa de R$ 300 com combustível.' })

    expect(result.kind).toBe('DRAFT')
    expect(result.draft).toEqual(
      expect.objectContaining({
        draftType: 'CREATE_EXPENSE',
        payload: expect.objectContaining({ amount: 300, status: 'PENDING' }),
        confirmationRequired: true,
      }),
    )
    expect(executeAssistantTool).not.toHaveBeenCalled()
    expect(prismaMock.expense.create).not.toHaveBeenCalled()
  })

  it('chat gera CREATE_BILL_DRAFT sem salvar', async () => {
    const result = await AssistantService.chat('company-1', { message: 'Crie um boleto de R$ 1200 para vencer dia 10.' })

    expect(result.kind).toBe('DRAFT')
    expect(result.draft).toEqual(
      expect.objectContaining({
        draftType: 'CREATE_BILL',
        payload: expect.objectContaining({ amount: 1200, status: 'PENDING' }),
        confirmationRequired: true,
      }),
    )
    expect(executeAssistantTool).not.toHaveBeenCalled()
    expect(prismaMock.bill.create).not.toHaveBeenCalled()
  })

  it('chat gera CREATE_BILL_INSTALLMENT_GROUP sem salvar', async () => {
    const result = await AssistantService.chat('company-1', { message: 'Crie um boleto de R$ 4000 dividido em 4 vezes.' })

    expect(result.kind).toBe('DRAFT')
    expect(result.draft).toEqual(
      expect.objectContaining({
        draftType: 'CREATE_BILL_INSTALLMENT_GROUP',
        payload: expect.objectContaining({
          totalAmount: 4000,
          installmentCount: 4,
          interval: 'MONTHLY',
        }),
        missingFields: expect.arrayContaining(['firstDueDate']),
        confirmationRequired: true,
      }),
    )
    expect(executeAssistantTool).not.toHaveBeenCalled()
    expect(prismaMock.billGroup.create).not.toHaveBeenCalled()
    expect(prismaMock.bill.create).not.toHaveBeenCalled()
  })

  it('chat gera CREATE_EMPLOYEE_PAYMENT_DRAFT sem salvar', async () => {
    prismaMock.employee.findMany.mockResolvedValue([{ id: '22222222-2222-4222-8222-222222222222', name: 'João' }])

    const result = await AssistantService.chat('company-1', { message: 'Paguei R$ 500 de vale para o João.' })

    expect(result.kind).toBe('DRAFT')
    expect(result.draft).toEqual(
      expect.objectContaining({
        draftType: 'CREATE_EMPLOYEE_PAYMENT',
        payload: expect.objectContaining({ amount: 500, type: 'ADVANCE' }),
        missingFields: expect.arrayContaining(['accountId']),
        confirmationRequired: true,
      }),
    )
    expect(executeAssistantTool).not.toHaveBeenCalled()
    expect(prismaMock.employeePayment.create).not.toHaveBeenCalled()
  })

  it('chat gera CREATE_REVENUE_DRAFT sem salvar', async () => {
    prismaMock.product.findMany.mockResolvedValue([{ id: '44444444-4444-4444-8444-444444444444', name: 'Cafe' }])

    const result = await AssistantService.chat('company-1', { message: 'Recebi R$ 1.750 de venda de cafe.' })

    expect(result.kind).toBe('DRAFT')
    expect(result.answer).toContain('rascunho de receita')
    expect(result.draft).toEqual(
      expect.objectContaining({
        draftType: 'CREATE_REVENUE',
        payload: expect.objectContaining({
          amount: 1750,
          quantity: 1,
          unitPrice: 1750,
          status: 'RECEIVED',
          productId: '44444444-4444-4444-8444-444444444444',
        }),
        missingFields: expect.arrayContaining(['accountId']),
        confirmationRequired: true,
      }),
    )
    expect(executeAssistantTool).not.toHaveBeenCalled()
    expect(prismaMock.revenue.create).not.toHaveBeenCalled()
  })

  it('frase recebida no caixa gera draft RECEIVED', async () => {
    prismaMock.account.findMany.mockResolvedValue([{ id: '33333333-3333-4333-8333-333333333333', name: 'Caixa' }])

    const result = await AssistantService.chat('company-1', { message: 'Recebi R$ 800 no caixa.' })

    expect(result.kind).toBe('DRAFT')
    expect(result.draft?.draftType).toBe('CREATE_REVENUE')
    expect(result.draft?.payload).toEqual(
      expect.objectContaining({
        amount: 800,
        status: 'RECEIVED',
        accountId: '33333333-3333-4333-8333-333333333333',
      }),
    )
    expect(result.draft?.missingFields).toContain('productId')
    expect(prismaMock.revenue.create).not.toHaveBeenCalled()
  })

  it('frase de receita pendente gera draft PENDING', async () => {
    const result = await AssistantService.chat('company-1', { message: 'Tenho uma receita pendente de R$ 3000 para receber dia 10.' })

    expect(result.kind).toBe('DRAFT')
    expect(result.draft?.draftType).toBe('CREATE_REVENUE')
    expect(result.draft?.payload).toEqual(expect.objectContaining({ amount: 3000, status: 'PENDING' }))
    expect(result.draft?.missingFields).toContain('productId')
    expect(result.draft?.missingFields).not.toContain('accountId')
    expect(prismaMock.revenue.create).not.toHaveBeenCalled()
  })

  it('complementa rascunho aberto com funcionario e conta sem tratar como consulta nova', async () => {
    prismaMock.employee.findMany.mockResolvedValue([{ id: '22222222-2222-4222-8222-222222222222', name: 'Joao' }])
    prismaMock.account.findMany.mockResolvedValue([{ id: '33333333-3333-4333-8333-333333333333', name: 'Sicredi' }])

    const result = await AssistantService.chat('company-1', {
      message: 'funcionario joao e conta sicredi',
      context: {
        currentDraft: {
          draftType: 'CREATE_EMPLOYEE_PAYMENT',
          payload: {
            type: 'ADVANCE',
            amount: 500,
            date: new Date('2026-07-01T00:00:00.000Z'),
            referenceMonth: 7,
            referenceYear: 2026,
          },
          missingFields: ['employeeId', 'accountId'],
          confirmationRequired: true,
        },
      },
    })

    expect(result.kind).toBe('DRAFT')
    expect(result.draft?.payload).toEqual(
      expect.objectContaining({
        employeeId: '22222222-2222-4222-8222-222222222222',
        accountId: '33333333-3333-4333-8333-333333333333',
      }),
    )
    expect(result.draft?.missingFields).toEqual([])
    expect(executeAssistantTool).not.toHaveBeenCalled()
    expect(prismaMock.employeePayment.create).not.toHaveBeenCalled()
  })

  it('complementa rascunho aberto de receita', async () => {
    prismaMock.product.findMany.mockResolvedValue([{ id: '44444444-4444-4444-8444-444444444444', name: 'Cafe' }])
    prismaMock.account.findMany.mockResolvedValue([{ id: '33333333-3333-4333-8333-333333333333', name: 'Sicredi' }])

    const result = await AssistantService.chat('company-1', {
      message: 'produto cafe e recebido no sicredi',
      context: {
        currentDraft: {
          draftType: 'CREATE_REVENUE',
          payload: {
            description: 'Receita',
            amount: 800,
            quantity: 1,
            unitPrice: 800,
            date: new Date('2026-07-01T00:00:00.000Z'),
            status: 'RECEIVED',
          },
          missingFields: ['productId', 'accountId'],
          confirmationRequired: true,
        },
      },
    })

    expect(result.kind).toBe('DRAFT')
    expect(result.draft?.payload).toEqual(
      expect.objectContaining({
        productId: '44444444-4444-4444-8444-444444444444',
        accountId: '33333333-3333-4333-8333-333333333333',
      }),
    )
    expect(result.draft?.missingFields).toEqual([])
    expect(executeAssistantTool).not.toHaveBeenCalled()
    expect(prismaMock.revenue.create).not.toHaveBeenCalled()
  })

  it('complementa rascunho aberto de parcelamento', async () => {
    prismaMock.supplier.findMany.mockResolvedValue([{ id: '55555555-5555-4555-8555-555555555555', name: 'Casa Agricola' }])
    prismaMock.category.findMany.mockResolvedValue([{ id: '11111111-1111-4111-8111-111111111111', name: 'Defensivos' }])

    const result = await AssistantService.chat('company-1', {
      message: 'fornecedor Casa Agricola categoria defensivos primeira parcela dia 10',
      context: {
        currentDraft: {
          draftType: 'CREATE_BILL_INSTALLMENT_GROUP',
          payload: {
            description: 'Compra parcelada',
            totalAmount: 4000,
            installmentCount: 4,
            interval: 'MONTHLY',
          },
          missingFields: ['firstDueDate'],
          confirmationRequired: true,
        },
      },
    })

    expect(result.kind).toBe('DRAFT')
    expect(result.draft?.payload).toEqual(
      expect.objectContaining({
        supplierId: '55555555-5555-4555-8555-555555555555',
        categoryId: '11111111-1111-4111-8111-111111111111',
      }),
    )
    expect(result.draft?.payload).toHaveProperty('firstDueDate')
    expect(executeAssistantTool).not.toHaveBeenCalled()
    expect(prismaMock.bill.create).not.toHaveBeenCalled()
  })

  it('roteia pergunta sobre despesas pendentes para despesas', async () => {
    mockToolData({
      count: 1,
      total: 620,
      expenses: [{ description: 'Defensivos para manejo preventivo', amount: 620, dueDate: '2026-07-09T00:00:00.000Z', status: 'PENDING' }],
    })

    const result = await AssistantService.chat('company-1', { message: 'Quanto tenho em despesas pendentes?' })

    expectTool('company-1', 'getPendingExpenses')
    expect(result.answer).toContain('620')
    expect(result.answer).toContain('Defensivos')
  })

  it('interpreta "e em despesa?" usando historico recente sobre boletos', async () => {
    mockToolData({ count: 1, total: 620, expenses: [{ description: 'Defensivos', amount: 620, status: 'PENDING' }] })

    await AssistantService.chat('company-1', {
      message: 'e em despesa?',
      context: {
        recentMessages: [
          { role: 'user', content: 'eu tenho quanto a ser pago alem de boleto?' },
          { role: 'assistant', content: 'Você tem boletos pendentes.' },
        ],
      },
    })

    expectTool('company-1', 'getPendingExpenses')
  })

  it('separa "alem de boleto" como despesa e nao boleto', async () => {
    await AssistantService.chat('company-1', { message: 'Eu tenho quanto a ser pago alem de boleto?' })

    expectTool('company-1', 'getPendingExpenses')
  })

  it('lista safras cadastradas usando ferramenta direta de safras', async () => {
    mockToolData({
      count: 1,
      data: [{ name: 'Café 2026', status: 'ACTIVE', startDate: '2026-01-01T00:00:00.000Z', product: { name: 'Café' }, farmLocation: { name: 'Talhão Café 1' } }],
    })

    const result = await AssistantService.chat('company-1', { message: 'Tenho safras cadastradas?' })

    expectTool('company-1', 'getSafras')
    expect(result.answer).toContain('Café 2026')
  })

  it('garante que safra sem movimento financeiro aparece', async () => {
    mockToolData({
      count: 1,
      data: [{ name: 'Safra sem lançamentos', status: 'PLANNED', startDate: '2026-08-01T00:00:00.000Z', product: { name: 'Pepino' }, farmLocation: null }],
    })

    const result = await AssistantService.chat('company-1', { message: 'Quais safras eu tenho?' })

    expectTool('company-1', 'getSafras')
    expect(result.answer).toContain('Safra sem lançamentos')
  })

  it('roteia pergunta sobre safra com prejuizo para resumo financeiro', async () => {
    mockToolData({ count: 1, data: [{ safraName: 'Café 2026', projectedResult: -300 }] })

    const result = await AssistantService.chat('company-1', { message: 'Qual safra está dando prejuízo?' })

    expectTool('company-1', 'getSafrasWithFinancialSummary')
    expect(result.answer).toContain('resultado previsto negativo')
  })

  it('roteia boletos pendentes', async () => {
    await AssistantService.chat('company-1', { message: 'Quais boletos pendentes eu tenho?' })
    expectTool('company-1', 'getPendingBills')
  })

  it('pergunta sobre boletos parcelados continua consulta', async () => {
    const result = await AssistantService.chat('company-1', { message: 'Quais boletos parcelados eu tenho?' })

    expect(result.kind).toBe('ANSWER')
    expect(result.draft).toBeUndefined()
    expectTool('company-1', 'getPendingBills')
  })

  it('roteia boletos vencidos', async () => {
    await AssistantService.chat('company-1', { message: 'Quais boletos estão vencidos?' })
    expectTool('company-1', 'getOverdueBills')
  })

  it('roteia receitas pendentes', async () => {
    await AssistantService.chat('company-1', { message: 'Quanto tenho a receber este mês?' })
    expectTool('company-1', 'getReceivablesNextDays')
  })

  it('pergunta quanto tenho a receber continua consulta e nao draft', async () => {
    const result = await AssistantService.chat('company-1', { message: 'quanto tenho a receber?' })

    expect(result.kind).toBe('ANSWER')
    expect(result.draft).toBeUndefined()
    expectTool('company-1', 'getReceivablesNextDays')
  })

  it('roteia saldo atual para posicao financeira', async () => {
    mockToolData({ position: { totalBalance: 1000 }, commitments: { payablesNext7Days: 200, receivablesNext7Days: 300 } })

    const result = await AssistantService.chat('company-1', { message: 'Qual meu saldo atual?' })

    expectTool('company-1', 'getCurrentFinancialPosition')
    expect(result.answer).toContain('saldo atual')
  })

  it('responde pergunta ambigua de pagar separando boletos e despesas', async () => {
    mockToolData({ bills: { total: 500, count: 1 }, expenses: { total: 620, count: 1 }, totalPayables: 1120 })

    const result = await AssistantService.chat('company-1', { message: 'Quanto tenho para pagar?' })

    expectTool('company-1', 'getPayablesSummary')
    expect(result.answer).toContain('Boletos')
    expect(result.answer).toContain('Despesas')
  })

  it('usa apenas o companyId recebido do backend', async () => {
    await AssistantService.chat('company-abc', { message: 'Quais boletos estão vencidos?' })

    expectTool('company-abc', 'getOverdueBills')
  })

  it('nao inventa quando nao existe ferramenta segura', async () => {
    const result = await AssistantService.chat('company-1', { message: 'Qual funcionário trabalhou mais horas?' })

    expect(result.kind).toBe('NEEDS_CLARIFICATION')
    expect(result.answer).toContain('ainda não consigo consultar')
    expect(executeAssistantTool).not.toHaveBeenCalled()
  })
})

afterAll(() => {
  ;(env as typeof env).AI_ENABLED = originalEnv.AI_ENABLED
  ;(env as typeof env).AI_API_KEY = originalEnv.AI_API_KEY
  ;(env as typeof env).AI_MODEL = originalEnv.AI_MODEL
  ;(env as typeof env).AI_TIMEOUT_MS = originalEnv.AI_TIMEOUT_MS
})
