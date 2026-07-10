import { z } from 'zod'
import { SupplyUnit } from '@agrofinance/database'
import { paginationSchema, uuidSchema } from '@agrofinance/shared'

export const inputPurchaseItemSchema = z.object({
  supplyId: uuidSchema,
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  unit: z.nativeEnum(SupplyUnit),
  totalAmount: z.coerce.number().positive('Valor total do item deve ser maior que zero'),
})

export const createInputPurchaseSchema = z.object({
  supplierId: uuidSchema.nullable().optional(),
  purchaseDate: z.coerce.date(),
  documentNumber: z.string().max(100).trim().nullable().optional(),
  notes: z.string().max(500).trim().nullable().optional(),
  items: z
    .array(inputPurchaseItemSchema)
    .min(1, 'Informe ao menos um item da compra'),
})

export const listInputPurchasesSchema = paginationSchema.extend({
  supplierId: uuidSchema.optional(),
  supplyId: uuidSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

export const inputPurchaseParamsSchema = z.object({ id: uuidSchema })

export type InputPurchaseItemDto = z.infer<typeof inputPurchaseItemSchema>
export type CreateInputPurchaseDto = z.infer<typeof createInputPurchaseSchema>
export type ListInputPurchasesQuery = z.infer<typeof listInputPurchasesSchema>
