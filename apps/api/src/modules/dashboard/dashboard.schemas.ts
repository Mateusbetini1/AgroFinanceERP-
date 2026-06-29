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

export const forecastQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(12),
  startMonth: z.coerce.number().int().min(1).max(12).optional(),
  startYear: z.coerce.number().int().min(2000).max(2100).optional(),
})

export const payablesQuerySchema = dashboardQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const monthlyDashboardQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
})

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>
export type CashflowQuery = z.infer<typeof cashflowQuerySchema>
export type ForecastQuery = z.infer<typeof forecastQuerySchema>
export type PayablesQuery = z.infer<typeof payablesQuerySchema>
export type MonthlyDashboardQuery = z.infer<typeof monthlyDashboardQuerySchema>
