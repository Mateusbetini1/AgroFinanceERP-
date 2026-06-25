import { z } from 'zod'
import { CategoryType } from '@agrofinance/database'
import { paginationSchema, uuidSchema } from '@agrofinance/shared'

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)')

export const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Nome é obrigatório' })
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  type: z.nativeEnum(CategoryType).default(CategoryType.BOTH),
  color: hexColorSchema.optional(),
})

export const updateCategorySchema = z
  .object({
    name: z.string().min(2).max(100).trim().optional(),
    type: z.nativeEnum(CategoryType).optional(),
    color: hexColorSchema.nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nenhum campo enviado para atualização',
  })

export const listCategoriesSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  type: z.nativeEnum(CategoryType).optional(),
})

export const categoryParamsSchema = z.object({ id: uuidSchema })

export type CreateCategoryDto = z.infer<typeof createCategorySchema>
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>
export type ListCategoriesQuery = z.infer<typeof listCategoriesSchema>
