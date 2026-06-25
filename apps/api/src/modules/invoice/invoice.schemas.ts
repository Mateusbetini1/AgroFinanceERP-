import { z } from 'zod'
import { paginationSchema, uuidSchema } from '@agrofinance/shared'

const fileTypeSchema = z.enum(['PDF', 'XML', 'IMAGE'])
const ocrStatusSchema = z.enum(['NONE', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'])

function hasExactlyOneLink(data: {
  revenueId?: string | null
  expenseId?: string | null
  billId?: string | null
}) {
  return [data.revenueId, data.expenseId, data.billId].filter(Boolean).length === 1
}

export const createInvoiceSchema = z
  .object({
    number: z.string().max(100).trim().optional(),
    amount: z.number().positive('Valor deve ser maior que zero').optional(),
    issuedAt: z.coerce.date().optional(),
    fileUrl: z.string().url('URL do arquivo invalida'),
    fileType: fileTypeSchema,
    revenueId: uuidSchema.optional(),
    expenseId: uuidSchema.optional(),
    billId: uuidSchema.optional(),
    ocrStatus: ocrStatusSchema.default('NONE'),
    ocrData: z.any().optional(),
  })
  .refine(hasExactlyOneLink, {
    message: 'Informe exatamente um vinculo: revenueId, expenseId ou billId',
    path: ['revenueId'],
  })

export const updateInvoiceSchema = z
  .object({
    number: z.string().max(100).trim().nullable().optional(),
    amount: z.number().positive('Valor deve ser maior que zero').nullable().optional(),
    issuedAt: z.coerce.date().nullable().optional(),
    fileUrl: z.string().url('URL do arquivo invalida').optional(),
    fileType: fileTypeSchema.optional(),
    revenueId: uuidSchema.nullable().optional(),
    expenseId: uuidSchema.nullable().optional(),
    billId: uuidSchema.nullable().optional(),
    ocrStatus: ocrStatusSchema.optional(),
    ocrData: z.any().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nenhum campo enviado para atualizacao',
  })

export const listInvoicesSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  fileType: fileTypeSchema.optional(),
  ocrStatus: ocrStatusSchema.optional(),
  revenueId: uuidSchema.optional(),
  expenseId: uuidSchema.optional(),
  billId: uuidSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

export const invoiceParamsSchema = z.object({ id: uuidSchema })

export type CreateInvoiceDto = z.infer<typeof createInvoiceSchema>
export type UpdateInvoiceDto = z.infer<typeof updateInvoiceSchema>
export type ListInvoicesQuery = z.infer<typeof listInvoicesSchema>
