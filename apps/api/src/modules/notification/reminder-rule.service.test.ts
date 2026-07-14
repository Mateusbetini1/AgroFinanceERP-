import { describe, expect, it, beforeEach } from 'vitest'
import { ReminderRecurrenceType, ReminderRuleType } from '@agrofinance/database'
import { ReminderRuleService } from './reminder-rule.service'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const companyId = 'company-1'
const otherCompanyId = 'company-2'
const userId = 'user-1'
const ruleId = '11111111-1111-4111-8111-111111111111'

const baseRule = {
  id: ruleId,
  companyId,
  userId,
  name: 'Faculdade',
  type: ReminderRuleType.BILL,
  active: true,
  recurrenceType: ReminderRecurrenceType.MONTHLY_DAY,
  dayOfMonth: 8,
  dueDate: null,
  leadDays: [2, 0],
  pushEnabled: true,
  inAppEnabled: true,
  notes: 'Mensalidade',
  createdAt: new Date('2026-07-08T00:00:00.000Z'),
  updatedAt: new Date('2026-07-08T00:00:00.000Z'),
  deletedAt: null,
}

describe('ReminderRuleService', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('lista apenas regras da empresa e usuario autenticados', async () => {
    prismaMock.reminderRule.findMany.mockResolvedValue([baseRule])

    const result = await ReminderRuleService.list(companyId, userId)

    expect(result).toEqual([baseRule])
    expect(prismaMock.reminderRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId, userId, deletedAt: null },
      }),
    )
  })

  it('cria regra mensal valida usando companyId e userId do backend', async () => {
    prismaMock.reminderRule.create.mockResolvedValue(baseRule)

    const result = await ReminderRuleService.create(companyId, userId, {
      name: 'Faculdade',
      type: ReminderRuleType.BILL,
      active: true,
      recurrenceType: ReminderRecurrenceType.MONTHLY_DAY,
      dayOfMonth: 8,
      leadDays: [2, 0],
      pushEnabled: true,
      inAppEnabled: true,
      notes: 'Mensalidade',
      companyId: otherCompanyId,
    } as never)

    expect(result).toEqual(baseRule)
    expect(prismaMock.reminderRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId,
          userId,
          dayOfMonth: 8,
          dueDate: null,
        }),
      }),
    )
  })

  it('cria regra de data unica valida', async () => {
    const oneTime = {
      ...baseRule,
      type: ReminderRuleType.EXPENSE,
      recurrenceType: ReminderRecurrenceType.ONE_TIME,
      dayOfMonth: null,
      dueDate: new Date('2026-08-08T12:00:00.000Z'),
    }
    prismaMock.reminderRule.create.mockResolvedValue(oneTime)

    await ReminderRuleService.create(companyId, userId, {
      name: 'Despesa avulsa',
      type: ReminderRuleType.EXPENSE,
      active: true,
      recurrenceType: ReminderRecurrenceType.ONE_TIME,
      dueDate: '2026-08-08T12:00:00.000Z',
      leadDays: [7, 0],
      pushEnabled: false,
      inAppEnabled: true,
    })

    expect(prismaMock.reminderRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recurrenceType: ReminderRecurrenceType.ONE_TIME,
          dayOfMonth: null,
          dueDate: new Date('2026-08-08T12:00:00.000Z'),
        }),
      }),
    )
  })

  it('rejeita MONTHLY_DAY sem dayOfMonth', async () => {
    await expect(
      ReminderRuleService.create(companyId, userId, {
        name: 'Faculdade',
        type: ReminderRuleType.BILL,
        active: true,
        recurrenceType: ReminderRecurrenceType.MONTHLY_DAY,
        leadDays: [0],
        pushEnabled: true,
        inAppEnabled: true,
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_REMINDER_RULE' })
  })

  it('rejeita ONE_TIME sem dueDate', async () => {
    await expect(
      ReminderRuleService.create(companyId, userId, {
        name: 'Compromisso',
        type: ReminderRuleType.GENERAL,
        active: true,
        recurrenceType: ReminderRecurrenceType.ONE_TIME,
        leadDays: [0],
        pushEnabled: true,
        inAppEnabled: true,
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_REMINDER_RULE' })
  })

  it('rejeita leadDays vazio', async () => {
    await expect(
      ReminderRuleService.create(companyId, userId, {
        name: 'Faculdade',
        type: ReminderRuleType.BILL,
        active: true,
        recurrenceType: ReminderRecurrenceType.MONTHLY_DAY,
        dayOfMonth: 8,
        leadDays: [],
        pushEnabled: true,
        inAppEnabled: true,
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_REMINDER_RULE' })
  })

  it('rejeita leadDays fora de 0, 1, 2, 7', async () => {
    await expect(
      ReminderRuleService.create(companyId, userId, {
        name: 'Faculdade',
        type: ReminderRuleType.BILL,
        active: true,
        recurrenceType: ReminderRecurrenceType.MONTHLY_DAY,
        dayOfMonth: 8,
        leadDays: [3],
        pushEnabled: true,
        inAppEnabled: true,
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_REMINDER_RULE' })
  })

  it('edita regra da propria empresa e usuario', async () => {
    prismaMock.reminderRule.findFirst.mockResolvedValue(baseRule)
    prismaMock.reminderRule.update.mockResolvedValue({ ...baseRule, name: 'Faculdade atualizada' })

    await ReminderRuleService.update(companyId, userId, ruleId, { name: 'Faculdade atualizada' })

    expect(prismaMock.reminderRule.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ruleId, companyId, userId, deletedAt: null },
      }),
    )
    expect(prismaMock.reminderRule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ruleId },
        data: expect.objectContaining({ name: 'Faculdade atualizada' }),
      }),
    )
  })

  it('bloqueia edicao de regra de outra empresa', async () => {
    prismaMock.reminderRule.findFirst.mockResolvedValue(null)

    await expect(ReminderRuleService.update(companyId, userId, ruleId, { active: false })).rejects.toMatchObject({
      statusCode: 404,
    })

    expect(prismaMock.reminderRule.update).not.toHaveBeenCalled()
  })

  it('marca deletedAt ao excluir sem confundir com desativar', async () => {
    prismaMock.reminderRule.findFirst.mockResolvedValue(baseRule)
    prismaMock.reminderRule.update.mockResolvedValue({ ...baseRule, deletedAt: new Date('2026-07-08T12:00:00.000Z') })

    const result = await ReminderRuleService.delete(companyId, userId, ruleId)

    expect(result).toEqual({ id: ruleId, deleted: true })
    expect(prismaMock.reminderRule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ruleId },
        data: { deletedAt: expect.any(Date) },
      }),
    )
    expect(prismaMock.account.update).not.toHaveBeenCalled()
    expect(prismaMock.transaction.create).not.toHaveBeenCalled()
    expect(prismaMock.revenue.update).not.toHaveBeenCalled()
    expect(prismaMock.expense.update).not.toHaveBeenCalled()
    expect(prismaMock.bill.update).not.toHaveBeenCalled()
  })

  it('bloqueia exclusao de regra de outra empresa ou usuario', async () => {
    prismaMock.reminderRule.findFirst.mockResolvedValue(null)

    await expect(ReminderRuleService.delete(companyId, userId, ruleId)).rejects.toMatchObject({
      statusCode: 404,
    })

    expect(prismaMock.reminderRule.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ruleId, companyId, userId, deletedAt: null },
      }),
    )
    expect(prismaMock.reminderRule.update).not.toHaveBeenCalled()
  })

  it('gera preview sem enviar notificacao', async () => {
    prismaMock.reminderRule.findMany.mockResolvedValue([baseRule])

    const result = await ReminderRuleService.preview(companyId, userId, new Date('2026-08-01T12:00:00.000Z'))

    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId,
          scheduledFor: new Date(2026, 7, 6).toISOString(),
          dueDate: new Date(2026, 7, 8).toISOString(),
          leadDays: 2,
        }),
        expect.objectContaining({
          ruleId,
          scheduledFor: new Date(2026, 7, 8).toISOString(),
          dueDate: new Date(2026, 7, 8).toISOString(),
          leadDays: 0,
        }),
      ]),
    )
    expect(prismaMock.pushSubscription.findMany).not.toHaveBeenCalled()
    expect(prismaMock.reminderRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId, userId, active: true, deletedAt: null },
      }),
    )
  })
})
