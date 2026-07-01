import { env } from '../../config/env'
import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import { BillService } from '../bill/bill.service'
import { EmployeePaymentService } from '../employee-payment/employee-payment.service'
import { ExpenseService } from '../expense/expense.service'
import { ASSISTANT_SYSTEM_PROMPT } from './assistant.prompts'
import { executeAssistantTool, mergeSources } from './assistant.tools'
import type { Request } from 'express'
import type {
  AssistantChatDto,
  AssistantDraft,
  AssistantResponse,
  AssistantToolCall,
  AssistantToolName,
  ConfirmAssistantDraftDto,
} from './assistant.schemas'

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
type DraftIntent = 'CREATE_EXPENSE' | 'CREATE_BILL' | 'CREATE_EMPLOYEE_PAYMENT'

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function isWriteAction(message: string) {
  return WRITE_ACTION_PATTERNS.some((pattern) => pattern.test(normalizeText(message)))
}

function getDraftIntent(message: string): DraftIntent | null {
  const normalized = normalizeText(message)
  if (!isWriteAction(message)) return null
  if (normalized.includes('funcionario') || normalized.includes('vale') || normalized.includes('adiantamento')) {
    return 'CREATE_EMPLOYEE_PAYMENT'
  }
  if (normalized.includes('boleto') || normalized.includes('vencer') || normalized.includes('vencimento')) {
    return 'CREATE_BILL'
  }
  if (normalized.includes('despesa') || normalized.includes('lance') || normalized.includes('lancar')) {
    return 'CREATE_EXPENSE'
  }
  return null
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

function extractAmount(message: string) {
  const match = message.match(/(?:R\$\s*)?(\d+(?:[.,]\d{1,2})?)/i)
  if (!match) return null
  return Number(match[1].replace('.', '').replace(',', '.'))
}

function makeDate(day?: number | null) {
  const now = new Date()
  if (!day) return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const candidate = new Date(now.getFullYear(), now.getMonth(), day)
  if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    return new Date(now.getFullYear(), now.getMonth() + 1, day)
  }
  return candidate
}

function extractDueDate(message: string) {
  const normalized = normalizeText(message)
  const iso = message.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/)
  if (iso) {
    const day = Number(iso[1])
    const month = Number(iso[2]) - 1
    const year = iso[3] ? Number(iso[3].length === 2 ? `20${iso[3]}` : iso[3]) : new Date().getFullYear()
    return new Date(year, month, day)
  }
  const dayMatch = normalized.match(/(?:dia|vencer dia|vence dia)\s+(\d{1,2})/)
  return makeDate(dayMatch ? Number(dayMatch[1]) : null)
}

function descriptionFromMessage(message: string, fallback: string) {
  const cleaned = message
    .replace(/R\$\s*\d+(?:[.,]\d{1,2})?/gi, '')
    .replace(/\b(crie|criar|lance|lançar|lancar|paguei|registre|registrar|uma|um|de|com|para|vencer|dia)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return (cleaned || fallback).slice(0, 500)
}

async function findSingleByName<T extends { id: string; name: string }>(
  finder: () => Promise<T[]>,
) {
  const matches = await finder()
  return matches.length === 1 ? matches[0] : null
}

function extractSearchAfterKeywords(message: string, keywords: string[]) {
  const escaped = keywords.map((keyword) => keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const match = message.match(new RegExp(`(?:${escaped})\\s+([^,.;]+)`, 'i'))
  return match?.[1]?.replace(/\b(e|com|para|na|no|da|do)\b.*$/i, '').trim().slice(0, 100) || null
}

async function resolveCategory(companyId: string, message: string) {
  const normalized = normalizeText(message)
  const explicit = extractSearchAfterKeywords(message, ['categoria'])
  const terms = explicit
    ? [explicit]
    : normalized.includes('combustivel')
    ? ['combust']
    : normalized.includes('defensivo')
      ? ['defensivo', 'insumo']
      : normalized.includes('insumo')
        ? ['insumo']
        : []
  if (terms.length === 0) return null
  return findSingleByName(() =>
    prisma.category.findMany({
      where: {
        companyId,
        deletedAt: null,
        type: { in: ['EXPENSE', 'BOTH'] },
        OR: terms.map((term) => ({ name: { contains: term, mode: 'insensitive' as const } })),
      },
      select: { id: true, name: true },
      take: 2,
    }),
  )
}

async function resolveSafra(companyId: string, message: string) {
  const normalized = normalizeText(message)
  if (!normalized.includes('safra')) return null
  const search = normalized.includes('cafe') ? 'cafe' : extractSearchAfterKeywords(message, ['safra']) ?? message.split(/safra/i)[1]?.trim()
  if (!search) return null
  return findSingleByName(() =>
    prisma.safra.findMany({
      where: {
        companyId,
        deletedAt: null,
        name: { contains: search, mode: 'insensitive' as const },
      },
      select: { id: true, name: true },
      take: 2,
    }),
  )
}

async function resolveEmployee(companyId: string, message: string) {
  const match = message.match(/(?:para|funcion[aá]rio)\s+(?:o\s+|a\s+)?([A-Za-zÀ-ÿ]+)/i)
  const name = extractSearchAfterKeywords(message, ['funcionario']) ?? match?.[1]
  if (!name) return null
  return findSingleByName(() =>
    prisma.employee.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: 'ACTIVE',
        name: { contains: name, mode: 'insensitive' as const },
      },
      select: { id: true, name: true },
      take: 2,
    }),
  )
}

async function resolveAccount(companyId: string, message: string) {
  const name = extractSearchAfterKeywords(message, ['conta'])
  if (!name) return null
  return findSingleByName(() =>
    prisma.account.findMany({
      where: {
        companyId,
        deletedAt: null,
        active: true,
        name: { contains: name, mode: 'insensitive' as const },
      },
      select: { id: true, name: true },
      take: 2,
    }),
  )
}

async function resolveSupplier(companyId: string, message: string) {
  const name = extractSearchAfterKeywords(message, ['fornecedor'])
  if (!name) return null
  return findSingleByName(() =>
    prisma.supplier.findMany({
      where: {
        companyId,
        deletedAt: null,
        name: { contains: name, mode: 'insensitive' as const },
      },
      select: { id: true, name: true },
      take: 2,
    }),
  )
}

function getRequiredMissingFields(draft: AssistantDraft) {
  const payload = draft.payload as Record<string, unknown>
  const missing: string[] = []
  const hasPositiveAmount = Number(payload.amount) > 0

  if (draft.draftType === 'CREATE_EXPENSE') {
    if (!payload.description) missing.push('description')
    if (!hasPositiveAmount) missing.push('amount')
    if (!payload.date) missing.push('date')
    if (!payload.status) missing.push('status')
    if (!payload.categoryId) missing.push('categoryId')
    if (payload.status === 'PAID' && !payload.accountId) missing.push('accountId')
    return missing
  }

  if (draft.draftType === 'CREATE_BILL') {
    if (!payload.description) missing.push('description')
    if (!hasPositiveAmount) missing.push('amount')
    if (!payload.dueDate) missing.push('dueDate')
    if (payload.status === 'PAID' && !payload.accountId) missing.push('accountId')
    return missing
  }

  if (!payload.employeeId) missing.push('employeeId')
  if (!payload.accountId) missing.push('accountId')
  if (!payload.type) missing.push('type')
  if (!hasPositiveAmount) missing.push('amount')
  if (!payload.date) missing.push('date')
  if (!Number.isInteger(Number(payload.referenceMonth)) || Number(payload.referenceMonth) < 1 || Number(payload.referenceMonth) > 12) {
    missing.push('referenceMonth')
  }
  if (!Number.isInteger(Number(payload.referenceYear)) || Number(payload.referenceYear) < 2000) missing.push('referenceYear')
  return missing
}

function withMissingFields(draft: AssistantDraft): AssistantDraft {
  return {
    ...draft,
    missingFields: [...new Set(getRequiredMissingFields(draft))],
  } as AssistantDraft
}

async function completeDraft(companyId: string, input: AssistantChatDto): Promise<AssistantDraft | null> {
  const currentDraft = input.context?.currentDraft
  if (!currentDraft || currentDraft.missingFields.length === 0) return null

  const [category, account, supplier, safra, employee] = await Promise.all([
    resolveCategory(companyId, input.message),
    resolveAccount(companyId, input.message),
    resolveSupplier(companyId, input.message),
    resolveSafra(companyId, input.message),
    resolveEmployee(companyId, input.message),
  ])

  const payload = { ...currentDraft.payload } as Record<string, unknown>
  if (currentDraft.draftType !== 'CREATE_EMPLOYEE_PAYMENT') {
    if (category) payload.categoryId = category.id
    if (supplier) payload.supplierId = supplier.id
    if (safra) payload.safraId = safra.id
  }
  if (account) payload.accountId = account.id
  if (currentDraft.draftType === 'CREATE_EMPLOYEE_PAYMENT' && employee) payload.employeeId = employee.id

  return withMissingFields({ ...currentDraft, payload } as AssistantDraft)
}

async function buildDraft(companyId: string, input: AssistantChatDto): Promise<AssistantDraft | null> {
  const intent = getDraftIntent(input.message)
  if (!intent) return null

  const amount = extractAmount(input.message)
  const today = makeDate()
  const missingFields: string[] = []

  if (!amount || amount <= 0) missingFields.push('amount')

  if (intent === 'CREATE_EXPENSE') {
    const category = await resolveCategory(companyId, input.message)
    const safra = await resolveSafra(companyId, input.message)
    const status = normalizeText(input.message).includes('paguei') ? 'PAID' : 'PENDING'
    if (!category) missingFields.push('categoryId')
    if (status === 'PAID') missingFields.push('accountId')

    return {
      draftType: 'CREATE_EXPENSE',
      payload: {
        description: descriptionFromMessage(input.message, 'Despesa'),
        amount: amount ?? 0,
        date: today,
        dueDate: status === 'PENDING' ? extractDueDate(input.message) : undefined,
        paidAt: status === 'PAID' ? today : undefined,
        status,
        categoryId: category?.id,
        safraId: safra?.id,
      },
      missingFields: [...new Set(missingFields)],
      confirmationRequired: true,
    }
  }

  if (intent === 'CREATE_BILL') {
    const category = await resolveCategory(companyId, input.message)
    const safra = await resolveSafra(companyId, input.message)
    if (!amount) missingFields.push('amount')

    return {
      draftType: 'CREATE_BILL',
      payload: {
        description: descriptionFromMessage(input.message, 'Boleto'),
        amount: amount ?? 0,
        dueDate: extractDueDate(input.message),
        status: 'PENDING',
        categoryId: category?.id,
        safraId: safra?.id,
      },
      missingFields: [...new Set(missingFields)],
      confirmationRequired: true,
    }
  }

  const employee = await resolveEmployee(companyId, input.message)
  if (!employee) missingFields.push('employeeId')
  missingFields.push('accountId')
  const date = today
  return {
    draftType: 'CREATE_EMPLOYEE_PAYMENT',
    payload: {
      employeeId: employee?.id,
      type: normalizeText(input.message).includes('diaria') ? 'DAILY_WAGE' : 'ADVANCE',
      amount: amount ?? 0,
      date,
      referenceMonth: date.getMonth() + 1,
      referenceYear: date.getFullYear(),
      notes: descriptionFromMessage(input.message, 'Pagamento de funcionário'),
    },
    missingFields: [...new Set(missingFields)],
    confirmationRequired: true,
  }
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

function isInstallmentDraftRequest(message: string) {
  const normalized = normalizeText(message)
  return (
    isWriteAction(message) &&
    (normalized.includes('boleto') || normalized.includes('conta para pagar')) &&
    (/\b\d+\s*(x|vezes|parcelas?)\b/.test(normalized) || normalized.includes('dividido') || normalized.includes('parcelado'))
  )
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

async function assertCompanyEntity(
  label: string,
  id: unknown,
  finder: (id: string) => Promise<number>,
) {
  if (!id) return
  const count = await finder(String(id))
  if (count === 0) throw AppError.badRequest(`${label} nÃ£o pertence Ã  empresa atual ou nÃ£o existe`)
}

async function validateDraftRelations(companyId: string, draft: AssistantDraft) {
  const payload = draft.payload as Record<string, unknown>

  await assertCompanyEntity('accountId', payload.accountId, (id) =>
    prisma.account.count({ where: { id, companyId, deletedAt: null } }),
  )
  await assertCompanyEntity('categoryId', payload.categoryId, (id) =>
    prisma.category.count({ where: { id, companyId, deletedAt: null } }),
  )
  await assertCompanyEntity('supplierId', payload.supplierId, (id) =>
    prisma.supplier.count({ where: { id, companyId, deletedAt: null } }),
  )
  await assertCompanyEntity('safraId', payload.safraId, (id) =>
    prisma.safra.count({ where: { id, companyId, deletedAt: null } }),
  )
  await assertCompanyEntity('employeeId', payload.employeeId, (id) =>
    prisma.employee.count({ where: { id, companyId, deletedAt: null } }),
  )
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

    const completedDraft = await completeDraft(companyId, input)
    if (completedDraft) {
      return {
        kind: 'DRAFT',
        answer: completedDraft.missingFields.length > 0
          ? 'Atualizei o rascunho com o que consegui identificar. Ainda faltam campos obrigatÃ³rios.'
          : 'Atualizei o rascunho. Revise e confirme para salvar.',
        sources: [],
        draft: completedDraft,
      }
    }

    if (isInstallmentDraftRequest(input.message)) {
      return {
        kind: 'NEEDS_CLARIFICATION',
        answer: 'Ainda nÃ£o consigo criar rascunhos de parcelamento nesta versÃ£o. Posso montar um boleto simples ou vocÃª pode usar a tela de Parcelamentos.',
        sources: [],
      }
    }

    const draft = await buildDraft(companyId, input)
    if (draft) {
      return {
        kind: 'DRAFT',
        answer: 'Montei um rascunho para você revisar.',
        sources: [],
        draft,
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

  async confirmDraft(companyId: string, input: ConfirmAssistantDraftDto, req: Request) {
    const draft = withMissingFields(input.draft)
    if (draft.missingFields.length > 0) {
      throw AppError.badRequest(`Preencha os campos obrigatórios antes de confirmar: ${draft.missingFields.join(', ')}`)
    }

    await validateDraftRelations(companyId, draft)

    if (draft.draftType === 'CREATE_EXPENSE') {
      if (!draft.payload.categoryId) throw AppError.badRequest('categoryId é obrigatório para confirmar despesa')
      return {
        draftType: draft.draftType,
        created: await ExpenseService.create(companyId, { ...draft.payload, categoryId: draft.payload.categoryId }, req),
      }
    }

    if (draft.draftType === 'CREATE_BILL') {
      return {
        draftType: draft.draftType,
        created: await BillService.create(companyId, draft.payload, req),
      }
    }

    if (!draft.payload.employeeId) throw AppError.badRequest('employeeId é obrigatório para confirmar pagamento')
    return {
      draftType: draft.draftType,
      created: await EmployeePaymentService.create(companyId, { ...draft.payload, employeeId: draft.payload.employeeId }, req),
    }
  },
}
