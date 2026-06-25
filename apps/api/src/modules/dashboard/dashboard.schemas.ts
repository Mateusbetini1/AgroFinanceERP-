import { z } from 'zod'
import { uuidSchema } from '@agrofinance/shared'

export const dashboardQuerySchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  productId: uuidSchema.optional(),
  safraId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  accountId: uuidSchema.optional(),
  supplierId: uuidSchema.optional(),
})

export const cashflowQuerySchema = dashboardQuerySchema.extend({
  months: z.coerce.number().int().min(1).max(24).optional(),
})

export const payablesQuerySchema = dashboardQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>
export type CashflowQuery = z.infer<typeof cashflowQuerySchema>
export type PayablesQuery = z.infer<typeof payablesQuerySchema>
