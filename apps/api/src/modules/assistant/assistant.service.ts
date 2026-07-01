import { env } from '../../config/env'
import { ASSISTANT_SYSTEM_PROMPT } from './assistant.prompts'
import { executeAssistantTool, mergeSources } from './assistant.tools'
import type { AssistantChatDto, AssistantResponse, AssistantToolCall, AssistantToolName } from './assistant.schemas'

const ALLOWED_TOOLS: AssistantToolName[] = [
  'getUpcomingBills',
  'getOverdueBills',
  'getPayablesNextDays',
  'getReceivablesNextDays',
  'getCashflowForecast',
  'getSafraSummary',
  'getExpensesByCategory',
  'getCurrentFinancialPosition',
]

const WRITE_ACTION_PATTERNS = [
  /^\s*(crie|criar|lance|lançar|registre|registrar|edite|editar|exclua|excluir|delete|deletar|remova|remover)\b/i,
  /\bpaguei\b/i,
  /^\s*pagar\b/i,
]

function isWriteAction(message: string) {
  return WRITE_ACTION_PATTERNS.some((pattern) => pattern.test(message))
}

function extractJson(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

function parseToolCall(value: unknown): AssistantToolCall | null {
  if (!value || typeof value !== 'object' || !('tool' in value)) return null
  const candidate = value as { tool?: unknown; args?: unknown }
  if (typeof candidate.tool !== 'string') return null
  if (!ALLOWED_TOOLS.includes(candidate.tool as AssistantToolName)) return null

  const args = candidate.args && typeof candidate.args === 'object' ? (candidate.args as Record<string, unknown>) : {}
  return {
    tool: candidate.tool as AssistantToolName,
    args: {
      days: typeof args.days === 'number' ? args.days : undefined,
      months: typeof args.months === 'number' ? args.months : undefined,
      search: typeof args.search === 'string' ? args.search : undefined,
    },
  }
}

function fallbackIntent(message: string): AssistantToolCall {
  const normalized = message.toLowerCase()
  const dayMatch = normalized.match(/pr[oó]ximos?\s+(\d+)\s+dias?/)
  const days = dayMatch ? Number(dayMatch[1]) : undefined

  if (normalized.includes('vencid')) return { tool: 'getOverdueBills' }
  if (normalized.includes('safra') || normalized.includes('preju')) {
    const search = normalized.includes('café') || normalized.includes('cafe') ? 'cafe' : undefined
    return { tool: 'getSafraSummary', args: { search } }
  }
  if (normalized.includes('caixa') || normalized.includes('projet')) return { tool: 'getCashflowForecast', args: { months: 1 } }
  if (normalized.includes('receber') || normalized.includes('receita')) return { tool: 'getReceivablesNextDays', args: { days: days ?? 30 } }
  if (normalized.includes('categoria') || normalized.includes('insumo') || normalized.includes('gastei')) {
    return { tool: 'getExpensesByCategory' }
  }
  if (normalized.includes('pagar') || normalized.includes('vence') || normalized.includes('boleto')) {
    return { tool: 'getPayablesNextDays', args: { days: days ?? 7 } }
  }
  return { tool: 'getCurrentFinancialPosition' }
}

async function callGeminiForTool(message: string): Promise<AssistantToolCall | null> {
  if (!env.AI_API_KEY) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.AI_MODEL}:generateContent?key=${env.AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: ASSISTANT_SYSTEM_PROMPT }],
          },
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 300,
            responseMimeType: 'application/json',
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: message }],
            },
          ],
        }),
      },
    )

    if (!response.ok) return null
    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? ''
    return parseToolCall(extractJson(text))
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function buildAnswer(toolCall: AssistantToolCall, data: unknown): string {
  const payload = data as Record<string, unknown>

  switch (toolCall.tool) {
    case 'getUpcomingBills':
    case 'getOverdueBills': {
      const count = Number(payload.count ?? 0)
      const total = Number(payload.total ?? 0)
      if (count === 0) return toolCall.tool === 'getOverdueBills' ? 'Não encontrei boletos vencidos.' : 'Não encontrei boletos próximos nesse período.'
      return `Encontrei ${count} boleto(s), totalizando ${formatCurrency(total)}. Confira a lista em Boletos.`
    }
    case 'getPayablesNextDays': {
      const upcomingBills = payload.upcomingBills as { count?: number; total?: number } | undefined
      const total = Number(upcomingBills?.total ?? payload.payablesNext7Days ?? 0)
      const count = Number(upcomingBills?.count ?? 0)
      return `Você tem ${formatCurrency(total)} a pagar no período consultado${count ? ` em ${count} boleto(s)` : ''}.`
    }
    case 'getReceivablesNextDays': {
      return `Você tem ${formatCurrency(Number(payload.total ?? 0))} a receber no período consultado.`
    }
    case 'getCashflowForecast': {
      const summary = payload.summary as { finalProjectedBalance?: number; lowestProjectedBalance?: number } | undefined
      return `No fluxo projetado, o saldo final estimado é ${formatCurrency(Number(summary?.finalProjectedBalance ?? 0))}. O menor saldo projetado é ${formatCurrency(Number(summary?.lowestProjectedBalance ?? 0))}.`
    }
    case 'getSafraSummary': {
      const items = (payload.data as Array<{ safraName?: string; projectedResult?: number }> | undefined) ?? []
      const negative = items.filter((item) => Number(item.projectedResult ?? 0) < 0)
      if (negative.length > 0) {
        return `Encontrei ${negative.length} safra(s) com resultado previsto negativo. A principal é ${negative[0].safraName ?? 'uma safra'} com resultado de ${formatCurrency(Number(negative[0].projectedResult ?? 0))}.`
      }
      return items.length > 0 ? 'Não encontrei safra com resultado previsto negativo nos dados consultados.' : 'Não encontrei safras para os filtros informados.'
    }
    case 'getExpensesByCategory': {
      const items = (payload.data as Array<{ categoryName?: string; total?: number }> | undefined) ?? []
      if (items.length === 0) return 'Não encontrei despesas por categoria no período atual.'
      return `A maior categoria de despesa no período é ${items[0].categoryName ?? 'sem categoria'}, com ${formatCurrency(Number(items[0].total ?? 0))}.`
    }
    case 'getCurrentFinancialPosition': {
      const position = payload.position as { totalBalance?: number } | undefined
      const commitments = payload.commitments as { payablesNext7Days?: number; receivablesNext7Days?: number; overduePayables?: number } | undefined
      return `Seu saldo atual em contas é ${formatCurrency(Number(position?.totalBalance ?? 0))}. Nos próximos 7 dias, há ${formatCurrency(Number(commitments?.payablesNext7Days ?? 0))} a pagar e ${formatCurrency(Number(commitments?.receivablesNext7Days ?? 0))} a receber.`
    }
  }
}

export const AssistantService = {
  async chat(companyId: string, input: AssistantChatDto): Promise<AssistantResponse> {
    if (!env.AI_ENABLED || !env.AI_API_KEY) {
      return {
        kind: 'ERROR',
        answer: 'O assistente ainda não está configurado. Configure AI_ENABLED=true e AI_API_KEY no backend.',
        sources: [],
      }
    }

    if (isWriteAction(input.message)) {
      return {
        kind: 'NEEDS_CLARIFICATION',
        answer: 'Nesta versão eu só consulto dados existentes. Não crio, edito, pago ou excluo lançamentos.',
        sources: [],
      }
    }

    const toolCall = (await callGeminiForTool(input.message)) ?? fallbackIntent(input.message)
    const result = await executeAssistantTool(companyId, toolCall)

    return {
      kind: 'ANSWER',
      answer: buildAnswer(toolCall, result.data),
      sources: mergeSources(result.sources),
      data: result.data,
    }
  },
}
