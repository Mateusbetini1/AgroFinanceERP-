import { z } from 'zod'
import { paginationSchema, uuidSchema } from '@agrofinance/shared'

export const createEmployeePaymentSchema = z.object({
  employeeId: uuidSchema,
  accountId: uuidSchema.optional(),
  type: z.enum(['SALARY', 'OVERTIME', 'ADVANCE', 'BONUS', 'DAILY_WAGE'], {
    required_error: 'Tipo de pagamento é obrigatório',
  }),
  amount: z
    .number({ required_error: 'Valor é obrigatório' })
    .positive('Valor deve ser maior que zero'),
  date: z.coerce.date({ required_error: 'Data do pagamento é obrigatória' }),
  referenceMonth: z
    .number({ required_error: 'Mês de competência é obrigatório' })
    .int()
    .min(1, 'Mês deve ser entre 1 e 12')
    .max(12, 'Mês deve ser entre 1 e 12'),
  referenceYear: z
    .number({ required_error: 'Ano de competência é obrigatório' })
    .int()
    .min(2000, 'Ano inválido'),
  notes: z.string().max(1000).trim().optional(),
})

export const updateEmployeePaymentSchema = z
  .object({
    employeeId: uuidSchema.optional(),
    accountId: uuidSchema.nullable().optional(),
    type: z.enum(['SALARY', 'OVERTIME', 'ADVANCE', 'BONUS', 'DAILY_WAGE']).optional(),
    amount: z.number().positive().optional(),
    date: z.coerce.date().optional(),
    referenceMonth: z.number().int().min(1).max(12).optional(),
    referenceYear: z.number().int().min(2000).optional(),
    notes: z.string().max(1000).trim().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nenhum campo enviado para atualização',
  })

export const listEmployeePaymentsSchema = paginationSchema.extend({
  employeeId: uuidSchema.optional(),
  accountId: uuidSchema.optional(),
  type: z.enum(['SALARY', 'OVERTIME', 'ADVANCE', 'BONUS', 'DAILY_WAGE']).optional(),
  // query strings chegam como texto; coerce converte para número
  referenceMonth: z.coerce.number().int().min(1).max(12).optional(),
  referenceYear: z.coerce.number().int().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

export const payrollSummaryQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
})

export const employeePaymentParamsSchema = z.object({ id: uuidSchema })

export type CreateEmployeePaymentDto = z.infer<typeof createEmployeePaymentSchema>
export type UpdateEmployeePaymentDto = z.infer<typeof updateEmployeePaymentSchema>
export type ListEmployeePaymentsQuery = z.infer<typeof listEmployeePaymentsSchema>
export type PayrollSummaryQuery = z.infer<typeof payrollSummaryQuerySchema>
