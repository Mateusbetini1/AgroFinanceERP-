import { z } from 'zod'
import { SupplyCategory, SupplyUnit } from '@agrofinance/database'
import { paginationSchema, uuidSchema } from '@agrofinance/shared'

const optionalTextSchema = z
  .string()
  .max(500, 'Observações devem ter no máximo 500 caracteres')
  .trim()
  .nullable()
  .optional()

const packageSizeBaseQuantitySchema = z
  .coerce
  .number()
  .positive('Tamanho da embalagem deve ser positivo')
  .nullable()
  .optional()

export const createSupplySchema = z.object({
  name: z
    .string({ required_error: 'Nome é obrigatório' })
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  category: z.nativeEnum(SupplyCategory, { required_error: 'Categoria é obrigatória' }),
  baseUnit: z.nativeEnum(SupplyUnit, { required_error: 'Unidade base é obrigatória' }),
  purchaseUnitDefault: z.nativeEnum(SupplyUnit, {
    required_error: 'Unidade padrão de compra é obrigatória',
  }),
  packageSizeBaseQuantity: packageSizeBaseQuantitySchema,
  packageSizeUnit: z.nativeEnum(SupplyUnit).nullable().optional(),
  active: z.boolean().default(true),
  notes: optionalTextSchema,
})

export const updateSupplySchema = z
  .object({
    name: z.string().min(2).max(100).trim().optional(),
    category: z.nativeEnum(SupplyCategory).optional(),
    baseUnit: z.nativeEnum(SupplyUnit).optional(),
    purchaseUnitDefault: z.nativeEnum(SupplyUnit).optional(),
    packageSizeBaseQuantity: packageSizeBaseQuantitySchema,
    packageSizeUnit: z.nativeEnum(SupplyUnit).nullable().optional(),
    active: z.boolean().optional(),
    notes: optionalTextSchema,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nenhum campo enviado para atualização',
  })

export const listSuppliesSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  category: z.nativeEnum(SupplyCategory).optional(),
  baseUnit: z.nativeEnum(SupplyUnit).optional(),
})

export const supplyParamsSchema = z.object({ id: uuidSchema })

export type CreateSupplyDto = z.infer<typeof createSupplySchema>
export type UpdateSupplyDto = z.infer<typeof updateSupplySchema>
export type ListSuppliesQuery = z.infer<typeof listSuppliesSchema>
