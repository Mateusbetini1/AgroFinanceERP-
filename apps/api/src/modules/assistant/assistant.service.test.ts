import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { env } from '../../config/env'

vi.mock('./assistant.tools', () => ({
  executeAssistantTool: vi.fn(),
  mergeSources: (sources: unknown[]) => sources,
}))

import { AssistantService } from './assistant.service'
import { executeAssistantTool } from './assistant.tools'

const originalEnv = {
  AI_ENABLED: env.AI_ENABLED,
  AI_API_KEY: env.AI_API_KEY,
  AI_MODEL: env.AI_MODEL,
  AI_TIMEOUT_MS: env.AI_TIMEOUT_MS,
}

function mockGeminiTool(tool: string, args: Record<string, unknown> = {}) {
  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify({ tool, args }) }],
          },
        },
      ],
    }),
  } as Response)
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
    vi.mocked(executeAssistantTool).mockResolvedValue({
      data: { count: 0, total: 0, bills: [] },
      sources: [{ label: 'Boletos', route: '/bills' }],
    })
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

  it('permite pergunta consultiva com a palavra pagar', async () => {
    mockGeminiTool('getPayablesNextDays', { days: 7 })
    vi.mocked(executeAssistantTool).mockResolvedValue({
      data: { upcomingBills: { count: 2, total: 800 } },
      sources: [{ label: 'Boletos', route: '/bills' }],
    })

    const result = await AssistantService.chat('company-1', { message: 'Tenho boleto para pagar nos proximos 7 dias?' })

    expect(result.kind).toBe('ANSWER')
    expect(executeAssistantTool).toHaveBeenCalledWith('company-1', {
      tool: 'getPayablesNextDays',
      args: { days: 7, months: undefined, search: undefined },
    })
    expect(result.answer).toContain('R$')
  })

  it('usa apenas o companyId recebido do backend na consulta de boletos', async () => {
    mockGeminiTool('getOverdueBills')

    await AssistantService.chat('company-abc', { message: 'Quais boletos estao vencidos?' })

    expect(executeAssistantTool).toHaveBeenCalledWith('company-abc', {
      tool: 'getOverdueBills',
      args: { days: undefined, months: undefined, search: undefined },
    })
  })

  it('nao executa escrita para pedidos de pagamento direto', async () => {
    const result = await AssistantService.chat('company-1', { message: 'Paguei R$ 500 de vale para Joao' })

    expect(result.kind).toBe('NEEDS_CLARIFICATION')
    expect(executeAssistantTool).not.toHaveBeenCalled()
  })
})

afterAll(() => {
  ;(env as typeof env).AI_ENABLED = originalEnv.AI_ENABLED
  ;(env as typeof env).AI_API_KEY = originalEnv.AI_API_KEY
  ;(env as typeof env).AI_MODEL = originalEnv.AI_MODEL
  ;(env as typeof env).AI_TIMEOUT_MS = originalEnv.AI_TIMEOUT_MS
})
