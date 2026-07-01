import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { env } from '../../config/env'

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
  expect(executeAssistantTool).toHaveBeenCalledWith(
    companyId,
    expect.objectContaining({ tool }),
  )
}

describe('AssistantService.chat', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
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

  it('bloqueia pedidos de escrita sem executar ferramenta', async () => {
    const result = await AssistantService.chat('company-1', { message: 'Crie um boleto de 1200 para dia 10' })

    expect(result.kind).toBe('NEEDS_CLARIFICATION')
    expect(result.answer).toContain('consulto dados existentes')
    expect(executeAssistantTool).not.toHaveBeenCalled()
  })

  it('roteia pergunta sobre despesas pendentes para despesas', async () => {
    mockToolData({
      count: 1,
      total: 620,
      expenses: [
        {
          description: 'Defensivos para manejo preventivo',
          amount: 620,
          dueDate: '2026-07-09T00:00:00.000Z',
          status: 'PENDING',
        },
      ],
    })

    const result = await AssistantService.chat('company-1', { message: 'Quanto tenho em despesas pendentes?' })

    expectTool('company-1', 'getPendingExpenses')
    expect(result.answer).toContain('620')
    expect(result.answer).toContain('despesas pendentes')
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
    mockToolData({ count: 1, total: 620, expenses: [{ description: 'Defensivos', amount: 620, status: 'PENDING' }] })

    await AssistantService.chat('company-1', { message: 'Eu tenho quanto a ser pago alem de boleto?' })

    expectTool('company-1', 'getPendingExpenses')
  })

  it('lista safras cadastradas usando ferramenta direta de safras', async () => {
    mockToolData({
      count: 1,
      data: [
        {
          name: 'Café 2026',
          status: 'ACTIVE',
          startDate: '2026-01-01T00:00:00.000Z',
          product: { name: 'Café' },
          farmLocation: { name: 'Talhão Café 1' },
        },
      ],
    })

    const result = await AssistantService.chat('company-1', { message: 'Tenho safras cadastradas?' })

    expectTool('company-1', 'getSafras')
    expect(result.answer).toContain('1 safra')
    expect(result.answer).toContain('Café 2026')
  })

  it('responde quais safras existem sem depender de movimentacao financeira', async () => {
    mockToolData({
      count: 1,
      data: [
        {
          name: 'Safra sem lançamentos',
          status: 'PLANNED',
          startDate: '2026-08-01T00:00:00.000Z',
          product: { name: 'Pepino' },
          farmLocation: null,
        },
      ],
    })

    const result = await AssistantService.chat('company-1', { message: 'Quais safras eu tenho?' })

    expectTool('company-1', 'getSafras')
    expect(result.answer).toContain('Safra sem lançamentos')
  })

  it('roteia pergunta sobre safra ativa', async () => {
    await AssistantService.chat('company-1', { message: 'Tenho safra ativa?' })

    expectTool('company-1', 'getActiveSafras')
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

  it('roteia boletos vencidos', async () => {
    await AssistantService.chat('company-1', { message: 'Quais boletos estão vencidos?' })

    expectTool('company-1', 'getOverdueBills')
  })

  it('roteia receitas pendentes', async () => {
    await AssistantService.chat('company-1', { message: 'Quanto tenho a receber este mês?' })

    expectTool('company-1', 'getReceivablesNextDays')
  })

  it('roteia saldo atual para posicao financeira', async () => {
    mockToolData({ position: { totalBalance: 1000 }, commitments: { payablesNext7Days: 200, receivablesNext7Days: 300 } })

    const result = await AssistantService.chat('company-1', { message: 'Qual meu saldo atual?' })

    expectTool('company-1', 'getCurrentFinancialPosition')
    expect(result.answer).toContain('saldo atual')
  })

  it('responde pergunta ambigua de pagar separando boletos e despesas', async () => {
    mockToolData({
      bills: { total: 500, count: 1 },
      expenses: { total: 620, count: 1 },
      totalPayables: 1120,
    })

    const result = await AssistantService.chat('company-1', { message: 'Quanto tenho para pagar?' })

    expectTool('company-1', 'getPayablesSummary')
    expect(result.answer).toContain('Boletos')
    expect(result.answer).toContain('Despesas')
  })

  it('usa apenas o companyId recebido do backend', async () => {
    await AssistantService.chat('company-abc', { message: 'Quais boletos estão vencidos?' })

    expectTool('company-abc', 'getOverdueBills')
  })

  it('nao executa escrita para pedidos de pagamento direto', async () => {
    const result = await AssistantService.chat('company-1', { message: 'Paguei R$ 500 de vale para João' })

    expect(result.kind).toBe('NEEDS_CLARIFICATION')
    expect(executeAssistantTool).not.toHaveBeenCalled()
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
