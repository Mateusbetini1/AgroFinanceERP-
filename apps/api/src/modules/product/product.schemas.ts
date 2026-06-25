import { z } from 'zod'
import { UnitType } from '@agrofinance/database'
import { paginationSchema, uuidSchema } from '@agrofinance/shared'

export const createProductSchema = z.object({
  name: z
    .string({ required_error: 'Nome é obrigatório' })
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  description: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .trim()
    .optional(),
  unit: z.nativeEnum(UnitType).default(UnitType.KG),
  categoryId: uuidSchema.optional(),
})

export const updateProductSchema = z
  .object({
    name: z.string().min(2).max(100).trim().optional(),
    description: z.string().max(500).trim().nullable().optional(),
    unit: z.nativeEnum(UnitType).optional(),
    active: z.boolean().optional(),
    categoryId: uuidSchema.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nenhum campo enviado para atualização',
  })

export const listProductsSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  unit: z.nativeEnum(UnitType).optional(),
  categoryId: uuidSchema.optional(),
})

export const productParamsSchema = z.object({ id: uuidSchema })

export type CreateProductDto = z.infer<typeof createProductSchema>
export type UpdateProductDto = z.infer<typeof updateProductSchema>
export type ListProductsQuery = z.infer<typeof listProductsSchema>
