import { z } from 'zod'
import { paginationSchema, uuidSchema } from '@agrofinance/shared'

export const createFarmLocationSchema = z.object({
  name: z
    .string({ required_error: 'Nome é obrigatório' })
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  type: z.enum(['GREENHOUSE', 'PLOT', 'FIELD'], {
    required_error: 'Tipo é obrigatório',
  }),
  area: z.number().positive('Área deve ser maior que zero').optional(),
  notes: z.string().max(1000).trim().optional(),
})

export const updateFarmLocationSchema = z
  .object({
    name: z.string().min(2).max(100).trim().optional(),
    type: z.enum(['GREENHOUSE', 'PLOT', 'FIELD']).optional(),
    area: z.number().positive().nullable().optional(),
    notes: z.string().max(1000).trim().nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nenhum campo enviado para atualização',
  })

export const listFarmLocationsSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  type: z.enum(['GREENHOUSE', 'PLOT', 'FIELD']).optional(),
  active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
})

export const farmLocationParamsSchema = z.object({ id: uuidSchema })

export type CreateFarmLocationDto = z.infer<typeof createFarmLocationSchema>
export type UpdateFarmLocationDto = z.infer<typeof updateFarmLocationSchema>
export type ListFarmLocationsQuery = z.infer<typeof listFarmLocationsSchema>
