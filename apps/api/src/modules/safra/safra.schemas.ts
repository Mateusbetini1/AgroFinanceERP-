import { z } from 'zod'
import { paginationSchema, uuidSchema } from '@agrofinance/shared'

const safraStatusSchema = z.enum(['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'])

export const createSafraSchema = z
  .object({
    productId: uuidSchema,
    farmLocationId: uuidSchema.optional(),
    name: z
      .string({ required_error: 'Nome e obrigatorio' })
      .min(2, 'Nome deve ter no minimo 2 caracteres')
      .max(200, 'Nome deve ter no maximo 200 caracteres')
      .trim(),
    startDate: z.coerce.date({ required_error: 'Data de inicio e obrigatoria' }),
    endDate: z.coerce.date().optional(),
    estimatedYield: z
      .number()
      .min(0, 'Producao estimada nao pode ser negativa')
      .optional(),
    status: safraStatusSchema.default('PLANNED'),
    notes: z.string().max(1000).trim().optional(),
  })
  .refine((data) => !data.endDate || data.endDate > data.startDate, {
    message: 'Data de encerramento deve ser posterior a data de inicio',
    path: ['endDate'],
  })

export const updateSafraSchema = z
  .object({
    productId: uuidSchema.optional(),
    farmLocationId: uuidSchema.nullable().optional(),
    name: z.string().min(2).max(200).trim().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().nullable().optional(),
    estimatedYield: z.number().min(0, 'Producao estimada nao pode ser negativa').nullable().optional(),
    status: safraStatusSchema.optional(),
    notes: z.string().max(1000).trim().nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nenhum campo enviado para atualizacao',
  })

export const listSafrasSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: safraStatusSchema.optional(),
  productId: uuidSchema.optional(),
  farmLocationId: uuidSchema.optional(),
  active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

export const safraParamsSchema = z.object({ id: uuidSchema })

export type CreateSafraDto = z.infer<typeof createSafraSchema>
export type UpdateSafraDto = z.infer<typeof updateSafraSchema>
export type ListSafrasQuery = z.infer<typeof listSafrasSchema>
