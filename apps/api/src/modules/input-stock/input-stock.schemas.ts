import { z } from 'zod'
import { InputStockMovementDirection, InputStockMovementType } from '@agrofinance/database'
import { paginationSchema, uuidSchema } from '@agrofinance/shared'

export const listInputStockSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  supplyId: uuidSchema.optional(),
})

export const listInputStockMovementsSchema = paginationSchema.extend({
  supplyId: uuidSchema.optional(),
  type: z.nativeEnum(InputStockMovementType).optional(),
  direction: z.nativeEnum(InputStockMovementDirection).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

export type ListInputStockQuery = z.infer<typeof listInputStockSchema>
export type ListInputStockMovementsQuery = z.infer<typeof listInputStockMovementsSchema>
