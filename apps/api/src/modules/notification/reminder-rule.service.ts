import { ReminderRecurrenceType, ReminderRuleType } from '@agrofinance/database'
import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import type { CreateReminderRuleDto, UpdateReminderRuleDto } from './reminder-rule.schemas'

const REMINDER_RULE_SELECT = {
  id: true,
  companyId: true,
  userId: true,
  name: true,
  type: true,
  active: true,
  recurrenceType: true,
  dayOfMonth: true,
  dueDate: true,
  leadDays: true,
  pushEnabled: true,
  inAppEnabled: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

type RuleShape = {
  name: string
  recurrenceType: ReminderRecurrenceType
  dayOfMonth?: number | null
  dueDate?: string | Date | null
  leadDays: number[]
}

type ExistingReminderRule = RuleShape & {
  type: ReminderRuleType
  active: boolean
  pushEnabled: boolean
  inAppEnabled: boolean
  notes: string | null
}

function normalizeLeadDays(leadDays: number[]) {
  return [...new Set(leadDays)]
}

function toDate(value?: string | Date | null) {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

function validateRuleShape(rule: RuleShape) {
  if (!rule.leadDays.length) {
    throw AppError.badRequest('Selecione pelo menos um lembrete', 'INVALID_REMINDER_RULE')
  }

  const invalidLeadDay = rule.leadDays.find((day) => ![0, 1, 2, 7].includes(day))
  if (invalidLeadDay !== undefined) {
    throw AppError.badRequest('Dias de antecedencia permitidos: 0, 1, 2 ou 7', 'INVALID_REMINDER_RULE')
  }

  if (rule.recurrenceType === ReminderRecurrenceType.MONTHLY_DAY && !rule.dayOfMonth) {
    throw AppError.badRequest('Dia do mes e obrigatorio para lembretes mensais', 'INVALID_REMINDER_RULE')
  }

  if (rule.recurrenceType === ReminderRecurrenceType.ONE_TIME && !rule.dueDate) {
    throw AppError.badRequest('Data e obrigatoria para lembretes de data unica', 'INVALID_REMINDER_RULE')
  }
}

function cleanCreateData(companyId: string, userId: string, input: CreateReminderRuleDto) {
  validateRuleShape(input)

  return {
    companyId,
    userId,
    name: input.name,
    type: input.type,
    active: input.active,
    recurrenceType: input.recurrenceType,
    dayOfMonth: input.recurrenceType === ReminderRecurrenceType.MONTHLY_DAY ? input.dayOfMonth : null,
    dueDate: input.recurrenceType === ReminderRecurrenceType.ONE_TIME ? toDate(input.dueDate) : null,
    leadDays: normalizeLeadDays(input.leadDays),
    pushEnabled: input.pushEnabled,
    inAppEnabled: input.inAppEnabled,
    notes: input.notes ?? null,
  }
}

function cleanUpdateData(existing: ExistingReminderRule, input: UpdateReminderRuleDto) {
  const merged = {
    name: input.name ?? existing.name,
    type: input.type ?? existing.type,
    active: input.active ?? existing.active,
    recurrenceType: input.recurrenceType ?? existing.recurrenceType,
    dayOfMonth: input.dayOfMonth !== undefined ? input.dayOfMonth : existing.dayOfMonth,
    dueDate: input.dueDate !== undefined ? input.dueDate : existing.dueDate,
    leadDays: input.leadDays ?? existing.leadDays,
    pushEnabled: input.pushEnabled ?? existing.pushEnabled,
    inAppEnabled: input.inAppEnabled ?? existing.inAppEnabled,
    notes: input.notes !== undefined ? input.notes : existing.notes,
  }

  validateRuleShape(merged)

  return {
    ...merged,
    dayOfMonth: merged.recurrenceType === ReminderRecurrenceType.MONTHLY_DAY ? merged.dayOfMonth : null,
    dueDate: merged.recurrenceType === ReminderRecurrenceType.ONE_TIME ? toDate(merged.dueDate) : null,
    leadDays: normalizeLeadDays(merged.leadDays),
  }
}

function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function monthlyDueDate(reference: Date, dayOfMonth: number, monthOffset: number) {
  const year = reference.getFullYear()
  const month = reference.getMonth() + monthOffset
  const candidate = new Date(year, month, 1)
  const day = Math.min(dayOfMonth, daysInMonth(candidate.getFullYear(), candidate.getMonth()))
  return new Date(candidate.getFullYear(), candidate.getMonth(), day)
}

function subtractDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - days)
}

function leadDayLabel(days: number) {
  if (days === 0) return 'no dia'
  if (days === 1) return '1 dia antes'
  return `${days} dias antes`
}

export const ReminderRuleService = {
  async list(companyId: string, userId: string) {
    return prisma.reminderRule.findMany({
      where: { companyId, userId, deletedAt: null },
      select: REMINDER_RULE_SELECT,
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    })
  },

  async findById(companyId: string, userId: string, id: string) {
    const rule = await prisma.reminderRule.findFirst({
      where: { id, companyId, userId, deletedAt: null },
      select: REMINDER_RULE_SELECT,
    })

    if (!rule) throw AppError.notFound('Lembrete')
    return rule
  },

  async create(companyId: string, userId: string, input: CreateReminderRuleDto) {
    return prisma.reminderRule.create({
      data: cleanCreateData(companyId, userId, input),
      select: REMINDER_RULE_SELECT,
    })
  },

  async update(companyId: string, userId: string, id: string, input: UpdateReminderRuleDto) {
    const existing = await ReminderRuleService.findById(companyId, userId, id)

    return prisma.reminderRule.update({
      where: { id },
      data: cleanUpdateData(existing, input),
      select: REMINDER_RULE_SELECT,
    })
  },

  async delete(companyId: string, userId: string, id: string) {
    const existing = await ReminderRuleService.findById(companyId, userId, id)

    await prisma.reminderRule.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
      select: REMINDER_RULE_SELECT,
    })

    return { id: existing.id, deleted: true }
  },

  async preview(companyId: string, userId: string, referenceDate = new Date()) {
    const today = startOfLocalDay(referenceDate)
    const rules = await prisma.reminderRule.findMany({
      where: { companyId, userId, active: true, deletedAt: null },
      select: REMINDER_RULE_SELECT,
      orderBy: [{ name: 'asc' }],
    })

    const items = rules.flatMap((rule) => {
      const occurrences: Array<{
        ruleId: string
        ruleName: string
        type: typeof rule.type
        scheduledFor: string
        dueDate: string
        leadDays: number
        label: string
      }> = []

      const dueDates =
        rule.recurrenceType === ReminderRecurrenceType.MONTHLY_DAY && rule.dayOfMonth
          ? Array.from({ length: 4 }, (_value, index) => monthlyDueDate(today, rule.dayOfMonth!, index))
          : rule.dueDate
            ? [startOfLocalDay(rule.dueDate)]
            : []

      for (const dueDate of dueDates) {
        for (const leadDays of rule.leadDays) {
          const scheduledFor = subtractDays(dueDate, leadDays)
          if (scheduledFor < today) continue

          occurrences.push({
            ruleId: rule.id,
            ruleName: rule.name,
            type: rule.type,
            scheduledFor: scheduledFor.toISOString(),
            dueDate: dueDate.toISOString(),
            leadDays,
            label: leadDayLabel(leadDays),
          })
        }
      }

      return occurrences
    })

    items.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())

    return { items: items.slice(0, 12) }
  },
}
