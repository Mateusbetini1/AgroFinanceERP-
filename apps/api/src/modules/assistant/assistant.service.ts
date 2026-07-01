import { env } from '../../config/env'
import { ASSISTANT_SYSTEM_PROMPT } from './assistant.prompts'
import { executeAssistantTool, mergeSources } from './assistant.tools'
import type { AssistantChatDto, AssistantResponse, AssistantToolCall, AssistantToolName } from './assistant.schemas'

const ALLOWED_TOOLS: AssistantToolName[] = [
  'getUpcomingBills',
  'getPendingBills',
  'getOverdueBills',
  'getPayablesNextDays',
  'getPayablesSummary',
  'getReceivablesNextDays',
  'getCashflowForecast',
  'getSafras',
  'getActiveSafras',
  'getSafraSummary',
  'getSafrasWithFinancialSummary',
  'getPendingExpenses',
  'getOverdueExpenses',
  'getExpensesDueNextDays',
  'getExpensesSummary',
  'getPaidExpenses',
  'getExpensesByCategory',
  'getCurrentFinancialPosition',
]

const WRITE_ACTION_PATTERNS = [
  /^\s*(crie|criar|lance|lancar|lançar|registre|registrar|edite|editar|exclua|excluir|delete|deletar|remova|remover)\b/i,
  /\bpaguei\b/i,
  /^\s*pagar\b/i,
]

type RoutedIntent = AssistantToolCall | { unsupported: true; reason: string }

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function isWriteAction(message: string) {
  return WRITE_ACTION_PATTERNS.some((pattern) => pattern.test(normalizeText(message)))
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

function getContextText(input: AssistantChatDto) {
  const recent = input.context?.recentMessages ?? []
  return recent.map((item) => `${item.role}: ${item.content}`).join('\n')
}

function extractDays(normalized: string) {
  const explicit = normalized.match(/proximos?\s+(\d+)\s+dias?/)
  if (explicit) return Number(explicit[1])
  if (normalized.includes('semana')) return 7
  if (normalized.includes('mes')) return 30
  return undefined
}

function extractSafraSearch(message: string) {
  const normalized = normalizeText(message)
  const cafe = normalized.includes('cafe') ? 'cafe' : undefined
  if (cafe) return cafe

  const match = message.match(/safra\s+(.+)$/i)
  return match?.[1]?.trim().slice(0, 100)
}

function routeIntent(input: AssistantChatDto): RoutedIntent | null {
  const normalized = normalizeText(input.message)
  const context = normalizeText(getContextText(input))
  const days = extractDays(normalized)
  const mentionsExpense = /\bdespesa(s)?\b/.test(normalized) || normalized.includes('alem de boleto')
  const mentionsBill = /\bboleto(s)?\b/.test(normalized) || normalized.includes('conta para pagar') || normalized.includes('contas para pagar')
  const mentionsSafra = /\bsafra(s)?\b/.test(normalized)
  const mentionsRevenue = normalized.includes('receita') || normalized.includes('receber')
  const mentionsCash = normalized.includes('saldo') || normalized.includes('caixa') || normalized.includes('posicao financeira')
  const mentionsForecast = normalized.includes('projet') || normalized.includes('fluxo')
  const mentionsCategory = normalized.includes('categoria') || normalized.includes('insumo') || normalized.includes('insumos')
  const asksToPay = normalized.includes('para pagar') || normalized.includes('a pagar') || normalized.includes('ser pago') || normalized.includes('tenho que pagar')

  if (normalized.includes('fornecedor') || normalized.includes('funcionario') || normalized.includes('folha')) {
    return { unsupported: true, reason: 'Eu ainda não consigo consultar fornecedores, funcionários ou folha com precisão nesta versão.' }
  }

  if (mentionsSafra) {
    if (normalized.includes('preju') || normalized.includes('resultado') || normalized.includes('financeir') || normalized.includes('custo')) {
      return { tool: 'getSafrasWithFinancialSummary', args: { search: extractSafraSearch(input.message) } }
    }
    if (normalized.includes('ativa') || normalized.includes('ativas') || normalized.includes('andamento')) {
      return { tool: 'getActiveSafras' }
    }
    return { tool: 'getSafras', args: { search: extractSafraSearch(input.message) } }
  }

  if (mentionsExpense || (normalized.trim().startsWith('e em despesa') && (context.includes('boleto') || context.includes('pagar')))) {
    if (normalized.includes('vencid')) return { tool: 'getOverdueExpenses' }
    if (days || normalized.includes('vence') || normalized.includes('vencem') || normalized.includes('semana')) {
      return { tool: 'getExpensesDueNextDays', args: { days: days ?? 7 } }
    }
    if (normalized.includes('paga') || normalized.includes('gastei') || normalized.includes('gasto')) {
      if (normalized.includes('pendente')) return { tool: 'getExpensesSummary' }
      return { tool: 'getPaidExpenses' }
    }
    if (mentionsCategory) return { tool: 'getExpensesByCategory' }
    return { tool: 'getPendingExpenses' }
  }

  if (mentionsBill) {
    if (normalized.includes('vencid')) return { tool: 'getOverdueBills' }
    if (normalized.includes('pendente') && !days) return { tool: 'getPendingBills' }
    if (days || normalized.includes('vence') || normalized.includes('vencem') || normalized.includes('dia ') || asksToPay) {
      return { tool: 'getPayablesNextDays', args: { days: days ?? 7 } }
    }
    return { tool: 'getPendingBills' }
  }

  if (mentionsRevenue) return { tool: 'getReceivablesNextDays', args: { days: days ?? 30 } }
  if (mentionsForecast) return { tool: 'getCashflowForecast', args: { months: normalized.includes('30 dias') ? 1 : 1 } }
  if (mentionsCash) return { tool: 'getCurrentFinancialPosition' }
  if (mentionsCategory) return { tool: 'getExpensesByCategory' }
  if (asksToPay || normalized.includes('quanto tenho para pagar')) return { tool: 'getPayablesSummary' }

  return null
}

function fallbackIntent(input: AssistantChatDto): RoutedIntent {
  const normalized = normalizeText(input.message)
  const days = extractDays(normalized)

  if (normalized.includes('vencid')) return { tool: 'getOverdueBills' }
  if (normalized.includes('receber') || normalized.includes('receita')) return { tool: 'getReceivablesNextDays', args: { days: days ?? 30 } }
  if (normalized.includes('pagar') || normalized.includes('vence')) return { tool: 'getPayablesSummary' }
  return { unsupported: true, reason: 'Eu ainda não consigo consultar isso com precisão nesta versão.' }
}

async function callGeminiForTool(input: AssistantChatDto): Promise<AssistantToolCall | null> {
  if (!env.AI_API_KEY) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS)
  const contextText = getContextText(input)

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
              parts: [
                {
                  text: contextText
                    ? `Histórico recente:\n${contextText}\n\nPergunta atual:\n${input.message}`
                    : input.message,
                },
              ],
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

function formatDate(value: unknown) {
  if (!value) return 'sem data'
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value as string | Date))
}

function itemList<T>(items: T[] | undefined, format: (item: T) => string, limit = 3) {
  if (!items || items.length === 0) return ''
  return ` Principais: ${items.slice(0, limit).map(format).join('; ')}.`
}

function statusLabel(status: unknown) {
  const value = String(status ?? '')
  const labels: Record<string, string> = {
    PENDING: 'Pendente',
    PAID: 'Pago',
    OVERDUE: 'Vencido',
    RECEIVED: 'Recebido',
    PLANNED: 'Planejada',
    ACTIVE: 'Ativa',
    COMPLETED: 'Concluída',
    CANCELLED: 'Cancelada',
  }
  return labels[value] ?? value
}

function buildBillAnswer(toolCall: AssistantToolCall, payload: Record<string, unknown>) {
  const count = Number(payload.count ?? 0)
  const total = Number(payload.total ?? 0)
  const bills = payload.bills as Array<{ description?: string; amount?: number; dueDate?: string; status?: string }> | undefined
  if (count === 0) {
    if (toolCall.tool === 'getOverdueBills') return 'Não encontrei boletos vencidos.'
    if (toolCall.tool === 'getUpcomingBills' || toolCall.tool === 'getPayablesNextDays') return 'Não encontrei boletos próximos no período consultado.'
    return 'Não encontrei boletos pendentes cadastrados.'
  }
  const intro = toolCall.tool === 'getOverdueBills' ? 'boletos vencidos' : toolCall.tool === 'getPendingBills' ? 'boletos pendentes' : 'boletos no período consultado'
  return `Encontrei ${count} ${intro}, totalizando ${formatCurrency(total)}.${itemList(bills, (bill) => `${bill.description ?? 'Boleto'} (${formatCurrency(Number(bill.amount ?? 0))}, venc. ${formatDate(bill.dueDate)}, ${statusLabel(bill.status)})`)}`
}

function buildExpenseAnswer(toolCall: AssistantToolCall, payload: Record<string, unknown>) {
  const count = Number(payload.count ?? 0)
  const total = Number(payload.total ?? 0)
  const expenses = payload.expenses as Array<{ description?: string; amount?: number; dueDate?: string; date?: string; status?: string }> | undefined

  if (toolCall.tool === 'getExpensesSummary') {
    const paid = payload.paid as { count?: number; total?: number }
    const pending = payload.pending as { count?: number; total?: number }
    const overdue = payload.overdue as { count?: number; total?: number }
    return `No mês atual, despesas pagas somam ${formatCurrency(Number(paid?.total ?? 0))} (${Number(paid?.count ?? 0)}), pendentes somam ${formatCurrency(Number(pending?.total ?? 0))} (${Number(pending?.count ?? 0)}) e vencidas somam ${formatCurrency(Number(overdue?.total ?? 0))} (${Number(overdue?.count ?? 0)}).`
  }

  if (count === 0) {
    if (toolCall.tool === 'getOverdueExpenses') return 'Não encontrei despesas vencidas.'
    if (toolCall.tool === 'getPaidExpenses') return 'Não encontrei despesas pagas no mês atual.'
    if (toolCall.tool === 'getExpensesDueNextDays') return 'Não encontrei despesas vencendo no período consultado.'
    return 'Não encontrei despesas pendentes cadastradas.'
  }

  const label =
    toolCall.tool === 'getOverdueExpenses'
      ? 'despesas vencidas'
      : toolCall.tool === 'getPaidExpenses'
        ? 'despesas pagas no mês atual'
        : toolCall.tool === 'getExpensesDueNextDays'
          ? 'despesas no período consultado'
          : 'despesas pendentes cadastradas'

  return `Você tem ${formatCurrency(total)} em ${label} (${count} lançamento(s)).${itemList(expenses, (expense) => `${expense.description ?? 'Despesa'} (${formatCurrency(Number(expense.amount ?? 0))}, venc. ${formatDate(expense.dueDate ?? expense.date)}, ${statusLabel(expense.status)})`)}`
}

function buildSafraAnswer(toolCall: AssistantToolCall, payload: Record<string, unknown>) {
  const items = (payload.data as Array<{
    name?: string
    safraName?: string
    product?: { name?: string; unit?: string }
    productName?: string
    farmLocation?: { name?: string }
    farmLocationName?: string | null
    status?: string
    startDate?: string
    endDate?: string | null
    projectedResult?: number
  }> | undefined) ?? []
  const count = Number(payload.count ?? items.length)

  if (count === 0) return 'Não encontrei safras cadastradas para os filtros informados.'

  if (toolCall.tool === 'getSafraSummary' || toolCall.tool === 'getSafrasWithFinancialSummary') {
    const negative = items.filter((item) => Number(item.projectedResult ?? 0) < 0)
    if (negative.length > 0) {
      return `Encontrei ${negative.length} safra(s) com resultado previsto negativo. Principal: ${negative[0].safraName ?? negative[0].name ?? 'Safra'} com resultado de ${formatCurrency(Number(negative[0].projectedResult ?? 0))}.`
    }
    return `Encontrei ${count} safra(s) no relatório e nenhuma com resultado previsto negativo nos dados consultados.`
  }

  return `Você tem ${count} safra(s) cadastrada(s).${itemList(items, (safra) => {
    const product = safra.product?.name ?? safra.productName ?? 'sem produto'
    const location = safra.farmLocation?.name ?? safra.farmLocationName ?? 'sem local'
    return `${safra.name ?? safra.safraName ?? 'Safra'} (${product}, ${location}, ${statusLabel(safra.status)}, início ${formatDate(safra.startDate)})`
  })}`
}

function buildAnswer(toolCall: AssistantToolCall, data: unknown): string {
  const payload = data as Record<string, unknown>

  switch (toolCall.tool) {
    case 'getUpcomingBills':
    case 'getPendingBills':
    case 'getOverdueBills':
      return buildBillAnswer(toolCall, payload)
    case 'getPayablesNextDays': {
      const upcomingBills = payload.upcomingBills as Record<string, unknown> | undefined
      return buildBillAnswer(toolCall, upcomingBills ?? payload)
    }
    case 'getPayablesSummary': {
      const bills = payload.bills as { total?: number; count?: number } | undefined
      const expenses = payload.expenses as { total?: number; count?: number } | undefined
      return `Considerando boletos e despesas pendentes/vencidas, você tem ${formatCurrency(Number(payload.totalPayables ?? 0))} a pagar. Boletos: ${formatCurrency(Number(bills?.total ?? 0))} (${Number(bills?.count ?? 0)}). Despesas: ${formatCurrency(Number(expenses?.total ?? 0))} (${Number(expenses?.count ?? 0)}).`
    }
    case 'getReceivablesNextDays': {
      const revenues = payload.revenues as Array<{ client?: string; totalAmount?: number; receivedAt?: string; date?: string }> | undefined
      return `Você tem ${formatCurrency(Number(payload.total ?? 0))} a receber no período consultado (${Number(payload.count ?? 0)} lançamento(s)).${itemList(revenues, (revenue) => `${revenue.client ?? 'Receita'} (${formatCurrency(Number(revenue.totalAmount ?? 0))}, data ${formatDate(revenue.receivedAt ?? revenue.date)})`)}`
    }
    case 'getCashflowForecast': {
      const summary = payload.summary as { finalProjectedBalance?: number; lowestProjectedBalance?: number } | undefined
      return `No fluxo projetado, o saldo final estimado é ${formatCurrency(Number(summary?.finalProjectedBalance ?? 0))}. O menor saldo projetado é ${formatCurrency(Number(summary?.lowestProjectedBalance ?? 0))}.`
    }
    case 'getSafras':
    case 'getActiveSafras':
    case 'getSafraSummary':
    case 'getSafrasWithFinancialSummary':
      return buildSafraAnswer(toolCall, payload)
    case 'getPendingExpenses':
    case 'getOverdueExpenses':
    case 'getExpensesDueNextDays':
    case 'getExpensesSummary':
    case 'getPaidExpenses':
      return buildExpenseAnswer(toolCall, payload)
    case 'getExpensesByCategory': {
      const items = (payload.data as Array<{ categoryName?: string; total?: number; count?: number }> | undefined) ?? []
      if (items.length === 0) return 'Não encontrei despesas por categoria no mês atual.'
      return `A maior categoria de despesa no mês atual é ${items[0].categoryName ?? 'sem categoria'}, com ${formatCurrency(Number(items[0].total ?? 0))}.`
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

    const deterministicIntent = routeIntent(input)
    const routedIntent = deterministicIntent ?? (await callGeminiForTool(input)) ?? fallbackIntent(input)

    if ('unsupported' in routedIntent) {
      return {
        kind: 'NEEDS_CLARIFICATION',
        answer: routedIntent.reason,
        sources: [],
      }
    }

    const result = await executeAssistantTool(companyId, routedIntent)

    return {
      kind: 'ANSWER',
      answer: buildAnswer(routedIntent, result.data),
      sources: mergeSources(result.sources),
      data: result.data,
    }
  },
}
