import { z } from 'zod'
import { ReminderRecurrenceType, ReminderRuleType } from '@agrofinance/database'
import { uuidSchema } from '@agrofinance/shared'

export const allowedLeadDays = [0, 1, 2, 7] as const

const leadDaysSchema = z
  .array(z.number().int())
  .min(1, 'Selecione pelo menos um lembrete')
  .refine((days) => days.every((day) => allowedLeadDays.includes(day as (typeof allowedLeadDays)[number])), {
    message: 'Dias de antecedencia permitidos: 0, 1, 2 ou 7',
  })

export const createReminderRuleSchema = z
  .object({
    name: z.string({ required_error: 'Nome e obrigatorio' }).min(2).max(120).trim(),
    type: z.nativeEnum(ReminderRuleType),
    active: z.boolean().default(true),
    recurrenceType: z.nativeEnum(ReminderRecurrenceType),
    dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
    dueDate: z.string().datetime().nullable().optional(),
    leadDays: leadDaysSchema,
    pushEnabled: z.boolean().default(true),
    inAppEnabled: z.boolean().default(true),
    notes: z.string().max(500).trim().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.recurrenceType === ReminderRecurrenceType.MONTHLY_DAY && !data.dayOfMonth) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dayOfMonth'],
        message: 'Dia do mes e obrigatorio para lembretes mensais',
      })
    }

    if (data.recurrenceType === ReminderRecurrenceType.ONE_TIME && !data.dueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dueDate'],
        message: 'Data e obrigatoria para lembretes de data unica',
      })
    }
  })

export const updateReminderRuleSchema = z
  .object({
    name: z.string().min(2).max(120).trim().optional(),
    type: z.nativeEnum(ReminderRuleType).optional(),
    active: z.boolean().optional(),
    recurrenceType: z.nativeEnum(ReminderRecurrenceType).optional(),
    dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
    dueDate: z.string().datetime().nullable().optional(),
    leadDays: leadDaysSchema.optional(),
    pushEnabled: z.boolean().optional(),
    inAppEnabled: z.boolean().optional(),
    notes: z.string().max(500).trim().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nenhum campo enviado para atualizacao',
  })

export const reminderRuleParamsSchema = z.object({ id: uuidSchema })

export type CreateReminderRuleDto = z.infer<typeof createReminderRuleSchema>
export type UpdateReminderRuleDto = z.infer<typeof updateReminderRuleSchema>
