import { z } from 'zod'

export const assistantChatSchema = z.object({
  message: z.string().trim().min(1, 'Mensagem é obrigatória').max(1000, 'Mensagem muito longa'),
  context: z
    .object({
      currentRoute: z.string().trim().max(200).optional(),
      recentMessages: z
        .array(
          z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string().trim().max(1000),
          }),
        )
        .max(8)
        .optional(),
    })
    .optional(),
})

export type AssistantChatDto = z.infer<typeof assistantChatSchema>

export type AssistantKind = 'ANSWER' | 'NEEDS_CLARIFICATION' | 'ERROR'

export type AssistantSource = {
  label: string
  route?: string
}

export type AssistantToolName =
  | 'getUpcomingBills'
  | 'getPendingBills'
  | 'getOverdueBills'
  | 'getPayablesNextDays'
  | 'getPayablesSummary'
  | 'getReceivablesNextDays'
  | 'getCashflowForecast'
  | 'getSafras'
  | 'getActiveSafras'
  | 'getSafraSummary'
  | 'getSafrasWithFinancialSummary'
  | 'getPendingExpenses'
  | 'getOverdueExpenses'
  | 'getExpensesDueNextDays'
  | 'getExpensesSummary'
  | 'getPaidExpenses'
  | 'getExpensesByCategory'
  | 'getCurrentFinancialPosition'

export type AssistantToolCall = {
  tool: AssistantToolName
  args?: {
    days?: number
    months?: number
    search?: string
  }
}

export type AssistantResponse = {
  answer: string
  kind: AssistantKind
  sources: AssistantSource[]
  data?: unknown
}
