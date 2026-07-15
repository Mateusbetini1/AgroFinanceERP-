import { z } from 'zod'
import { paginationSchema, uuidSchema } from '@agrofinance/shared'

export const createAccountSchema = z.object({
  name: z
    .string({ required_error: 'Nome é obrigatório' })
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  type: z.enum(['CASH', 'BANK'], { required_error: 'Tipo de conta é obrigatório' }),
  bankName: z.string().max(100).trim().optional(),
  agency: z.string().max(20).trim().optional(),
  accountNumber: z.string().max(30).trim().optional(),
  initialBalance: z
    .number({ invalid_type_error: 'Saldo inicial deve ser um número' })
    .default(0),
})

export const updateAccountSchema = z
  .object({
    name: z.string().min(2).max(100).trim().optional(),
    type: z.enum(['CASH', 'BANK']).optional(),
    bankName: z.string().max(100).trim().nullable().optional(),
    agency: z.string().max(20).trim().nullable().optional(),
    accountNumber: z.string().max(30).trim().nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nenhum campo enviado para atualização',
  })

export const listAccountsSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  type: z.enum(['CASH', 'BANK']).optional(),
})

export const accountParamsSchema = z.object({ id: uuidSchema })

export const accountSummaryQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
})

export type CreateAccountDto = z.infer<typeof createAccountSchema>
export type UpdateAccountDto = z.infer<typeof updateAccountSchema>
export type ListAccountsQuery = z.infer<typeof listAccountsSchema>
export type AccountSummaryQuery = z.infer<typeof accountSummaryQuerySchema>
