import type { Request } from 'express'
import type { Prisma } from '@agrofinance/database'
import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import { getPaginationArgs, buildPaginatedResponse } from '../../shared/utils/pagination'
import { writeAuditLog } from '../../shared/middleware/audit-log'
import { AuditAction } from '@agrofinance/shared'
import type {
  CreateEmployeePaymentDto,
  UpdateEmployeePaymentDto,
  ListEmployeePaymentsQuery,
} from './employee-payment.schemas'

const EMPLOYEE_PAYMENT_SELECT = {
  id: true,
  employeeId: true,
  employee: { select: { id: true, name: true, role: true, status: true } },
  accountId: true,
  account: { select: { id: true, name: true, type: true } },
  type: true,
  amount: true,
  date: true,
  referenceMonth: true,
  referenceYear: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const

async function validateEmployeeId(
  tx: Prisma.TransactionClient,
  companyId: string,
  employeeId: string,
): Promise<void> {
  const exists = await tx.employee.findFirst({
    where: { id: employeeId, companyId, deletedAt: null, status: 'ACTIVE' },
    select: { id: true },
  })

  if (!exists) throw AppError.notFound('Funcionario ativo')
}

async function validateAccountId(
  tx: Prisma.TransactionClient,
  companyId: string,
  accountId: string,
): Promise<void> {
  const exists = await tx.account.findFirst({
    where: { id: accountId, companyId, deletedAt: null, active: true },
    select: { id: true },
  })

  if (!exists) throw AppError.notFound('Conta')
}

async function applyPaymentBalanceAdjustment(
  tx: Prisma.TransactionClient,
  oldAccountId: string | null,
  oldAmount: number,
  newAccountId: string | null | undefined,
  newAmount: number,
): Promise<void> {
  const wasDebited = !!oldAccountId
  const willDebit = !!newAccountId

  if (wasDebited && willDebit) {
    if (oldAccountId === newAccountId) {
      const diff = oldAmount - newAmount
      if (diff > 0) {
        await tx.account.update({
          where: { id: oldAccountId },
          data: { currentBalance: { increment: diff } },
        })
      } else if (diff < 0) {
        await tx.account.update({
          where: { id: oldAccountId },
          data: { currentBalance: { decrement: Math.abs(diff) } },
        })
      }
    } else {
      await tx.account.update({
        where: { id: oldAccountId },
        data: { currentBalance: { increment: oldAmount } },
      })
      await tx.account.update({
        where: { id: newAccountId! },
        data: { currentBalance: { decrement: newAmount } },
      })
    }
  } else if (wasDebited && !willDebit) {
    await tx.account.update({
      where: { id: oldAccountId },
      data: { currentBalance: { increment: oldAmount } },
    })
  } else if (!wasDebited && willDebit) {
    await tx.account.update({
      where: { id: newAccountId! },
      data: { currentBalance: { decrement: newAmount } },
    })
  }
}

export const EmployeePaymentService = {
  async list(companyId: string, query: ListEmployeePaymentsQuery) {
    const {
      page,
      limit,
      employeeId,
      accountId,
      type,
      referenceMonth,
      referenceYear,
      dateFrom,
      dateTo,
    } = query
    const { skip, take } = getPaginationArgs({ page, limit })

    const where = {
      companyId,
      deletedAt: null,
      ...(employeeId ? { employeeId } : {}),
      ...(accountId ? { accountId } : {}),
      ...(type ? { type } : {}),
      ...(referenceMonth ? { referenceMonth } : {}),
      ...(referenceYear ? { referenceYear } : {}),
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      prisma.employeePayment.findMany({
        where,
        select: EMPLOYEE_PAYMENT_SELECT,
        orderBy: [{ referenceYear: 'desc' }, { referenceMonth: 'desc' }, { date: 'desc' }],
        skip,
        take,
      }),
      prisma.employeePayment.count({ where }),
    ])

    return buildPaginatedResponse(data, total, { page, limit })
  },

  async findById(companyId: string, id: string) {
    const payment = await prisma.employeePayment.findFirst({
      where: { id, companyId, deletedAt: null },
      select: EMPLOYEE_PAYMENT_SELECT,
    })

    if (!payment) throw AppError.notFound('Pagamento')
    return payment
  },

  async create(companyId: string, data: CreateEmployeePaymentDto, req: Request) {
    const payment = await prisma.$transaction(async (tx) => {
      await validateEmployeeId(tx, companyId, data.employeeId)
      if (data.accountId) await validateAccountId(tx, companyId, data.accountId)

      const created = await tx.employeePayment.create({
        data: { ...data, companyId },
        select: EMPLOYEE_PAYMENT_SELECT,
      })

      if (data.accountId) {
        await tx.account.update({
          where: { id: data.accountId },
          data: { currentBalance: { decrement: data.amount } },
        })
      }

      return created
    })

    await writeAuditLog(req, {
      action: AuditAction.CREATE,
      entityType: 'EmployeePayment',
      entityId: payment.id,
      after: payment,
    })

    return payment
  },

  async update(companyId: string, id: string, data: UpdateEmployeePaymentDto, req: Request) {
    const { existing, updated } = await prisma.$transaction(async (tx) => {
      const existing = await tx.employeePayment.findFirst({
        where: { id, companyId, deletedAt: null },
        select: EMPLOYEE_PAYMENT_SELECT,
      })

      if (!existing) throw AppError.notFound('Pagamento')

      const newAccountId = data.accountId !== undefined ? data.accountId : existing.accountId
      const newAmount = data.amount !== undefined ? data.amount : Number(existing.amount)

      if (data.employeeId !== undefined && data.employeeId !== existing.employeeId) {
        await validateEmployeeId(tx, companyId, data.employeeId)
      }

      if (data.accountId != null && data.accountId !== existing.accountId) {
        await validateAccountId(tx, companyId, data.accountId)
      }

      const updated = await tx.employeePayment.update({
        where: { id },
        data,
        select: EMPLOYEE_PAYMENT_SELECT,
      })

      await applyPaymentBalanceAdjustment(
        tx,
        existing.accountId,
        Number(existing.amount),
        newAccountId,
        newAmount,
      )

      return { existing, updated }
    })

    await writeAuditLog(req, {
      action: AuditAction.UPDATE,
      entityType: 'EmployeePayment',
      entityId: id,
      before: existing,
      after: updated,
    })

    return updated
  },

  async delete(companyId: string, id: string, req: Request) {
    const existing = await EmployeePaymentService.findById(companyId, id)

    await prisma.$transaction(async (tx) => {
      await tx.employeePayment.update({
        where: { id },
        data: { deletedAt: new Date() },
      })

      if (existing.accountId) {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { currentBalance: { increment: Number(existing.amount) } },
        })
      }
    })

    await writeAuditLog(req, {
      action: AuditAction.DELETE,
      entityType: 'EmployeePayment',
      entityId: id,
      before: existing,
    })
  },
}
