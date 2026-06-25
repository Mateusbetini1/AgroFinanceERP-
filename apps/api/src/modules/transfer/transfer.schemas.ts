import { z } from 'zod'
import { paginationSchema, uuidSchema } from '@agrofinance/shared'

export const createTransferSchema = z
  .object({
    fromAccountId: uuidSchema,
    toAccountId: uuidSchema,
    amount: z
      .number({ required_error: 'Valor e obrigatorio' })
      .positive('Valor deve ser maior que zero'),
    description: z.string().max(500).trim().optional(),
    date: z.coerce.date({ required_error: 'Data e obrigatoria' }),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: 'Conta de origem e destino devem ser diferentes',
    path: ['toAccountId'],
  })

export const updateTransferSchema = z
  .object({
    fromAccountId: uuidSchema.optional(),
    toAccountId: uuidSchema.optional(),
    amount: z.number().positive('Valor deve ser maior que zero').optional(),
    description: z.string().max(500).trim().nullable().optional(),
    date: z.coerce.date().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nenhum campo enviado para atualizacao',
  })
  .refine(
    (data) =>
      data.fromAccountId === undefined ||
      data.toAccountId === undefined ||
      data.fromAccountId !== data.toAccountId,
    {
      message: 'Conta de origem e destino devem ser diferentes',
      path: ['toAccountId'],
    },
  )

export const listTransfersSchema = paginationSchema.extend({
  fromAccountId: uuidSchema.optional(),
  toAccountId: uuidSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

export const transferParamsSchema = z.object({ id: uuidSchema })

export type CreateTransferDto = z.infer<typeof createTransferSchema>
export type UpdateTransferDto = z.infer<typeof updateTransferSchema>
export type ListTransfersQuery = z.infer<typeof listTransfersSchema>
