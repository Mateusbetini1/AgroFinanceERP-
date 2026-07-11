import { z } from 'zod'
import { SupplyUnit } from '@agrofinance/database'
import { paginationSchema, uuidSchema } from '@agrofinance/shared'

export const createInputApplicationSchema = z.object({
  supplyId: uuidSchema,
  applicationDate: z.coerce.date(),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  unit: z.nativeEnum(SupplyUnit),
  safraId: uuidSchema,
  farmLocationId: uuidSchema.nullable().optional(),
  notes: z.string().max(500).trim().nullable().optional(),
})

export const listInputApplicationsSchema = paginationSchema.extend({
  supplyId: uuidSchema.optional(),
  safraId: uuidSchema.optional(),
  farmLocationId: uuidSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

export const inputApplicationParamsSchema = z.object({ id: uuidSchema })

export type CreateInputApplicationDto = z.infer<typeof createInputApplicationSchema>
export type ListInputApplicationsQuery = z.infer<typeof listInputApplicationsSchema>
