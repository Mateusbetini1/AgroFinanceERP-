import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const monthYearSchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
})

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export const uuidSchema = z.string().uuid()

export const decimalSchema = z
  .union([z.string(), z.number()])
  .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, {
    message: 'Valor deve ser um número positivo',
  })
  .transform((v) => String(v))

export const brazilianPhoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Telefone inválido')
  .optional()

export const cpfCnpjSchema = z
  .string()
  .regex(/^\d{11}$|^\d{14}$/, 'CPF (11 dígitos) ou CNPJ (14 dígitos) inválido')
  .optional()
