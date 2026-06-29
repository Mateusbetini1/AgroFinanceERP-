import { z } from 'zod'
import { paginationSchema, uuidSchema } from '@agrofinance/shared'

export const createBillSchema = z
  .object({
    billGroupId: uuidSchema.optional(),
    supplierId: uuidSchema.optional(),
    accountId: uuidSchema.optional(),
    description: z
      .string({ required_error: 'Descrição é obrigatória' })
      .min(1, 'Descrição não pode ser vazia')
      .max(500, 'Descrição deve ter no máximo 500 caracteres')
      .trim(),
    amount: z
      .number({ required_error: 'Valor é obrigatório' })
      .positive('Valor deve ser maior que zero'),
    dueDate: z.coerce.date({ required_error: 'Data de vencimento é obrigatória' }),
    paidAt: z.coerce.date().optional(),
    status: z.enum(['PENDING', 'PAID']).default('PENDING'),
    fileUrl: z.string().url('URL do arquivo inválida').optional(),
    installmentNumber: z.number().int().positive().optional(),
    installmentCount: z.number().int().positive().optional(),
  })
  .refine(
    (data) => data.status !== 'PAID' || data.accountId !== undefined,
    { message: 'accountId é obrigatório quando status é PAID', path: ['accountId'] },
  )

export const createBillInstallmentsSchema = z.object({
  supplierId: uuidSchema.optional(),
  accountId: uuidSchema.optional(),
  description: z
    .string({ required_error: 'Descricao e obrigatoria' })
    .min(1, 'Descricao nao pode ser vazia')
    .max(500, 'Descricao deve ter no maximo 500 caracteres')
    .trim(),
  totalAmount: z
    .number({ required_error: 'Valor total e obrigatorio' })
    .positive('Valor total deve ser maior que zero'),
  installmentCount: z
    .number({ required_error: 'Quantidade de parcelas e obrigatoria' })
    .int('Quantidade de parcelas deve ser um numero inteiro')
    .min(2, 'Quantidade de parcelas deve ser no minimo 2'),
  firstDueDate: z.coerce.date({ required_error: 'Primeiro vencimento e obrigatorio' }),
  fileUrl: z.string().url('URL do arquivo invalida').optional(),
})

export const updateBillSchema = z
  .object({
    billGroupId: uuidSchema.nullable().optional(),
    supplierId: uuidSchema.nullable().optional(),
    accountId: uuidSchema.nullable().optional(),
    description: z.string().min(1).max(500).trim().optional(),
    amount: z.number().positive().optional(),
    dueDate: z.coerce.date().optional(),
    paidAt: z.coerce.date().nullable().optional(),
    status: z.enum(['PENDING', 'PAID']).optional(),
    fileUrl: z.string().url().nullable().optional(),
    installmentNumber: z.number().int().positive().nullable().optional(),
    installmentCount: z.number().int().positive().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nenhum campo enviado para atualização',
  })

export const listBillsSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  // OVERDUE é incluído para filtragem — o status é gerenciado por cron, não via API
  status: z.enum(['PENDING', 'PAID', 'OVERDUE']).optional(),
  supplierId: uuidSchema.optional(),
  accountId: uuidSchema.optional(),
  billGroupId: uuidSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

export const billGroupStatusSchema = z.enum(['PENDING', 'IN_PROGRESS', 'PAID', 'OVERDUE'])

export const listBillGroupsSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  supplierId: uuidSchema.optional(),
  status: billGroupStatusSchema.optional(),
})

export const billParamsSchema = z.object({ id: uuidSchema })

export type CreateBillDto = z.infer<typeof createBillSchema>
export type CreateBillInstallmentsDto = z.infer<typeof createBillInstallmentsSchema>
export type UpdateBillDto = z.infer<typeof updateBillSchema>
export type ListBillsQuery = z.infer<typeof listBillsSchema>
export type BillGroupStatus = z.infer<typeof billGroupStatusSchema>
export type ListBillGroupsQuery = z.infer<typeof listBillGroupsSchema>
