import { z } from 'zod'
import { paginationSchema, uuidSchema } from '@agrofinance/shared'

export const createExpenseSchema = z
  .object({
    categoryId: uuidSchema,
    supplierId: uuidSchema.optional(),
    accountId: uuidSchema.optional(),
    safraId: uuidSchema.optional(),
    date: z.coerce.date({ required_error: 'Data é obrigatória' }),
    dueDate: z.coerce.date().optional(),
    paidAt: z.coerce.date().optional(),
    amount: z
      .number({ required_error: 'Valor é obrigatório' })
      .positive('Valor deve ser maior que zero'),
    description: z
      .string({ required_error: 'Descrição é obrigatória' })
      .min(1, 'Descrição não pode ser vazia')
      .max(500, 'Descrição deve ter no máximo 500 caracteres')
      .trim(),
    status: z.enum(['PENDING', 'PAID']).default('PENDING'),
    attachmentUrl: z.string().url('URL do anexo inválida').optional(),
  })
  .refine(
    (data) => data.status !== 'PAID' || data.accountId !== undefined,
    { message: 'accountId é obrigatório quando status é PAID', path: ['accountId'] },
  )

export const updateExpenseSchema = z
  .object({
    categoryId: uuidSchema.optional(),
    supplierId: uuidSchema.nullable().optional(),
    accountId: uuidSchema.nullable().optional(),
    safraId: uuidSchema.nullable().optional(),
    date: z.coerce.date().optional(),
    dueDate: z.coerce.date().nullable().optional(),
    paidAt: z.coerce.date().nullable().optional(),
    amount: z.number().positive().optional(),
    description: z.string().min(1).max(500).trim().optional(),
    status: z.enum(['PENDING', 'PAID']).optional(),
    attachmentUrl: z.string().url().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nenhum campo enviado para atualização',
  })

export const listExpensesSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  // OVERDUE é incluído para filtragem — o status é gerenciado por cron, não via API
  status: z.enum(['PENDING', 'PAID', 'OVERDUE']).optional(),
  categoryId: uuidSchema.optional(),
  supplierId: uuidSchema.optional(),
  accountId: uuidSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

export const expenseParamsSchema = z.object({ id: uuidSchema })

export type CreateExpenseDto = z.infer<typeof createExpenseSchema>
export type UpdateExpenseDto = z.infer<typeof updateExpenseSchema>
export type ListExpensesQuery = z.infer<typeof listExpensesSchema>
