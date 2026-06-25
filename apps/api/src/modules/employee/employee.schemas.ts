import { z } from 'zod'
import { brazilianPhoneSchema, cpfCnpjSchema, paginationSchema, uuidSchema } from '@agrofinance/shared'

const cpfSchema = cpfCnpjSchema.unwrap().refine((value) => value.length === 11, {
  message: 'CPF deve ter 11 digitos numericos sem mascara',
})
const requiredBrazilianPhoneSchema = brazilianPhoneSchema.unwrap()

export const createEmployeeSchema = z.object({
  name: z
    .string({ required_error: 'Nome e obrigatorio' })
    .min(2, 'Nome deve ter no minimo 2 caracteres')
    .max(200, 'Nome deve ter no maximo 200 caracteres')
    .trim(),
  role: z
    .string({ required_error: 'Cargo e obrigatorio' })
    .min(2, 'Cargo deve ter no minimo 2 caracteres')
    .max(100, 'Cargo deve ter no maximo 100 caracteres')
    .trim(),
  document: cpfSchema.optional(),
  phone: brazilianPhoneSchema,
  pixKey: z.string().max(150).trim().optional(),
  baseSalary: z
    .number({ required_error: 'Salario base e obrigatorio' })
    .positive('Salario base deve ser maior que zero'),
  type: z.enum(['MONTHLY', 'DAILY'], { required_error: 'Tipo de vinculo e obrigatorio' }),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  hireDate: z.coerce.date({ required_error: 'Data de admissao e obrigatoria' }),
  notes: z.string().max(1000).trim().optional(),
})

export const updateEmployeeSchema = z
  .object({
    name: z.string().min(2).max(200).trim().optional(),
    role: z.string().min(2).max(100).trim().optional(),
    document: cpfSchema.nullable().optional(),
    phone: requiredBrazilianPhoneSchema.nullable().optional(),
    pixKey: z.string().max(150).trim().nullable().optional(),
    baseSalary: z.number().positive().optional(),
    type: z.enum(['MONTHLY', 'DAILY']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    hireDate: z.coerce.date().optional(),
    notes: z.string().max(1000).trim().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nenhum campo enviado para atualizacao',
  })

export const listEmployeesSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  type: z.enum(['MONTHLY', 'DAILY']).optional(),
})

export const employeeParamsSchema = z.object({ id: uuidSchema })

export type CreateEmployeeDto = z.infer<typeof createEmployeeSchema>
export type UpdateEmployeeDto = z.infer<typeof updateEmployeeSchema>
export type ListEmployeesQuery = z.infer<typeof listEmployeesSchema>
