import { z } from 'zod'
import { paginationSchema, uuidSchema } from '@agrofinance/shared'

export const createRevenueSchema = z
  .object({
    productId: uuidSchema,
    accountId: uuidSchema.optional(),
    safraId: uuidSchema.optional(),
    date: z.coerce.date({ required_error: 'Data é obrigatória' }),
    receivedAt: z.coerce.date().optional(),
    quantity: z
      .number({ required_error: 'Quantidade é obrigatória' })
      .positive('Quantidade deve ser maior que zero'),
    unitPrice: z
      .number({ required_error: 'Preço unitário é obrigatório' })
      .positive('Preço unitário deve ser maior que zero'),
    client: z.string().max(150).trim().optional(),
    notes: z.string().max(1000).trim().optional(),
    status: z.enum(['PENDING', 'RECEIVED']).default('PENDING'),
  })
  .refine(
    (data) => data.status !== 'RECEIVED' || data.accountId !== undefined,
    { message: 'accountId é obrigatório quando status é RECEIVED', path: ['accountId'] },
  )

export const updateRevenueSchema = z
  .object({
    productId: uuidSchema.optional(),
    accountId: uuidSchema.nullable().optional(),
    safraId: uuidSchema.nullable().optional(),
    date: z.coerce.date().optional(),
    receivedAt: z.coerce.date().nullable().optional(),
    quantity: z.number().positive().optional(),
    unitPrice: z.number().positive().optional(),
    client: z.string().max(150).trim().nullable().optional(),
    notes: z.string().max(1000).trim().nullable().optional(),
    status: z.enum(['PENDING', 'RECEIVED']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nenhum campo enviado para atualização',
  })

export const listRevenuesSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(['PENDING', 'RECEIVED']).optional(),
  productId: uuidSchema.optional(),
  safraId: uuidSchema.optional(),
  accountId: uuidSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

export const revenueParamsSchema = z.object({ id: uuidSchema })

export type CreateRevenueDto = z.infer<typeof createRevenueSchema>
export type UpdateRevenueDto = z.infer<typeof updateRevenueSchema>
export type ListRevenuesQuery = z.infer<typeof listRevenuesSchema>
