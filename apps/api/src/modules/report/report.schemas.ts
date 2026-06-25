import { z } from 'zod'
import { uuidSchema } from '@agrofinance/shared'

const basisSchema = z.enum(['accrual', 'cash']).default('accrual')
const formatSchema = z.enum(['json', 'csv']).default('json')

const baseReportSchema = z.object({
  format: formatSchema,
  basis: basisSchema,
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

export const revenueReportSchema = baseReportSchema.extend({
  status: z.enum(['PENDING', 'RECEIVED']).optional(),
  productId: uuidSchema.optional(),
  safraId: uuidSchema.optional(),
  accountId: uuidSchema.optional(),
})

export const expenseReportSchema = baseReportSchema.extend({
  status: z.enum(['PENDING', 'PAID', 'OVERDUE']).optional(),
  categoryId: uuidSchema.optional(),
  supplierId: uuidSchema.optional(),
  safraId: uuidSchema.optional(),
  accountId: uuidSchema.optional(),
})

export const billReportSchema = baseReportSchema.extend({
  status: z.enum(['PENDING', 'PAID', 'OVERDUE']).optional(),
  supplierId: uuidSchema.optional(),
  accountId: uuidSchema.optional(),
})

export const safraReportSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  productId: uuidSchema.optional(),
  farmLocationId: uuidSchema.optional(),
  status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  safraId: uuidSchema.optional(),
})

export const cashflowReportSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  productId: uuidSchema.optional(),
  safraId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  supplierId: uuidSchema.optional(),
  accountId: uuidSchema.optional(),
})

export const accountsReportSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  accountId: uuidSchema.optional(),
  active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  includeDeleted: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
})

export type RevenueReportQuery = z.infer<typeof revenueReportSchema>
export type ExpenseReportQuery = z.infer<typeof expenseReportSchema>
export type BillReportQuery = z.infer<typeof billReportSchema>
export type SafraReportQuery = z.infer<typeof safraReportSchema>
export type CashflowReportQuery = z.infer<typeof cashflowReportSchema>
export type AccountsReportQuery = z.infer<typeof accountsReportSchema>
