import { z } from 'zod'
import { brazilianPhoneSchema, cpfCnpjSchema, paginationSchema, uuidSchema } from '@agrofinance/shared'

const requiredCpfCnpjSchema = cpfCnpjSchema.unwrap()
const requiredBrazilianPhoneSchema = brazilianPhoneSchema.unwrap()

export const createSupplierSchema = z.object({
  name: z
    .string({ required_error: 'Nome e obrigatorio' })
    .min(2, 'Nome deve ter no minimo 2 caracteres')
    .max(150, 'Nome deve ter no maximo 150 caracteres')
    .trim(),
  document: requiredCpfCnpjSchema,
  email: z.string().email('E-mail invalido').toLowerCase().trim().optional(),
  phone: brazilianPhoneSchema,
  contactName: z.string().max(150, 'Contato deve ter no maximo 150 caracteres').trim().optional(),
  notes: z.string().max(1000, 'Observacoes devem ter no maximo 1000 caracteres').trim().optional(),
})

export const updateSupplierSchema = z
  .object({
    name: z.string().min(2).max(150).trim().optional(),
    document: requiredCpfCnpjSchema.optional(),
    email: z.string().email().toLowerCase().trim().nullable().optional(),
    phone: requiredBrazilianPhoneSchema.nullable().optional(),
    contactName: z.string().max(150).trim().nullable().optional(),
    notes: z.string().max(1000).trim().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nenhum campo enviado para atualizacao',
  })

export const listSuppliersSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
})

export const supplierParamsSchema = z.object({ id: uuidSchema })

export type CreateSupplierDto = z.infer<typeof createSupplierSchema>
export type UpdateSupplierDto = z.infer<typeof updateSupplierSchema>
export type ListSuppliersQuery = z.infer<typeof listSuppliersSchema>
