import { z } from 'zod'
import { uuidSchema } from '@agrofinance/shared'

export const assistantChatSchema = z.object({
  message: z.string().trim().min(1, 'Mensagem é obrigatória').max(1000, 'Mensagem muito longa'),
  context: z
    .object({
      currentRoute: z.string().trim().max(200).optional(),
      currentDraft: z.lazy(() => assistantDraftSchema).optional(),
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

const optionalUuid = uuidSchema.optional()

const expenseDraftPayloadSchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  date: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  paidAt: z.coerce.date().optional(),
  status: z.enum(['PENDING', 'PAID']),
  categoryId: optionalUuid,
  supplierId: optionalUuid,
  accountId: optionalUuid,
  safraId: optionalUuid,
})

const billDraftPayloadSchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  dueDate: z.coerce.date(),
  status: z.literal('PENDING'),
  categoryId: optionalUuid,
  supplierId: optionalUuid,
  accountId: optionalUuid,
  safraId: optionalUuid,
})

const employeePaymentDraftPayloadSchema = z.object({
  employeeId: uuidSchema.optional(),
  accountId: optionalUuid,
  type: z.enum(['SALARY', 'OVERTIME', 'ADVANCE', 'BONUS', 'DAILY_WAGE']),
  amount: z.number().positive(),
  date: z.coerce.date(),
  referenceMonth: z.number().int().min(1).max(12),
  referenceYear: z.number().int().min(2000),
  notes: z.string().max(1000).optional(),
})

export const assistantDraftSchema = z.discriminatedUnion('draftType', [
  z.object({
    draftType: z.literal('CREATE_EXPENSE'),
    payload: expenseDraftPayloadSchema,
    missingFields: z.array(z.string()),
    confirmationRequired: z.literal(true),
  }),
  z.object({
    draftType: z.literal('CREATE_BILL'),
    payload: billDraftPayloadSchema,
    missingFields: z.array(z.string()),
    confirmationRequired: z.literal(true),
  }),
  z.object({
    draftType: z.literal('CREATE_EMPLOYEE_PAYMENT'),
    payload: employeePaymentDraftPayloadSchema,
    missingFields: z.array(z.string()),
    confirmationRequired: z.literal(true),
  }),
])

export const confirmAssistantDraftSchema = z.object({
  draft: assistantDraftSchema,
})

export type AssistantChatDto = z.infer<typeof assistantChatSchema>
export type AssistantDraft = z.infer<typeof assistantDraftSchema>
export type ConfirmAssistantDraftDto = z.infer<typeof confirmAssistantDraftSchema>

export type AssistantKind = 'ANSWER' | 'NEEDS_CLARIFICATION' | 'ERROR' | 'DRAFT'

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
  draft?: AssistantDraft
}
