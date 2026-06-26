import type { Request } from 'express'
import type { Prisma } from '@agrofinance/database'
import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import { getPaginationArgs, buildPaginatedResponse } from '../../shared/utils/pagination'
import { writeAuditLog } from '../../shared/middleware/audit-log'
import { AuditAction } from '@agrofinance/shared'
import type {
  CreateBillDto,
  CreateBillInstallmentsDto,
  UpdateBillDto,
  ListBillsQuery,
} from './bill.schemas'

const BILL_SELECT = {
  id: true,
  billGroupId: true,
  supplierId: true,
  supplier: { select: { id: true, name: true } },
  accountId: true,
  account: { select: { id: true, name: true, type: true } },
  description: true,
  amount: true,
  dueDate: true,
  paidAt: true,
  status: true,
  fileUrl: true,
  installmentNumber: true,
  installmentCount: true,
  createdAt: true,
  updatedAt: true,
} as const

// ── FK validators ────────────────────────────────────────────────────────────

const BILL_GROUP_SELECT = {
  id: true,
  companyId: true,
  supplierId: true,
  description: true,
  totalAmount: true,
  installmentCount: true,
  createdAt: true,
  updatedAt: true,
} as const

function distributeInstallmentAmounts(totalAmount: number, installmentCount: number): number[] {
  const totalCents = Math.round(totalAmount * 100)
  const baseCents = Math.floor(totalCents / installmentCount)
  const remainderCents = totalCents % installmentCount

  return Array.from({ length: installmentCount }, (_, index) => {
    const cents = baseCents + (index === installmentCount - 1 ? remainderCents : 0)
    return cents / 100
  })
}

function addMonthsClamped(date: Date, months: number): Date {
  const targetYear = date.getUTCFullYear()
  const targetMonth = date.getUTCMonth() + months
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const targetDay = Math.min(date.getUTCDate(), lastDayOfTargetMonth)

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      targetDay,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  )
}

async function validateSupplierId(companyId: string, supplierId: string): Promise<void> {
  const exists = await prisma.supplier.findFirst({
    where: { id: supplierId, companyId, deletedAt: null },
    select: { id: true },
  })
  if (!exists) throw AppError.notFound('Fornecedor')
}

async function validateAccountId(companyId: string, accountId: string): Promise<void> {
  const exists = await prisma.account.findFirst({
    where: { id: accountId, companyId, deletedAt: null, active: true },
    select: { id: true },
  })
  if (!exists) throw AppError.notFound('Conta')
}

async function validateBillGroupId(companyId: string, billGroupId: string): Promise<void> {
  const exists = await prisma.billGroup.findFirst({
    where: { id: billGroupId, companyId },
    select: { id: true },
  })
  if (!exists) throw AppError.notFound('Grupo de boletos')
}

// ── Balance helper ───────────────────────────────────────────────────────────

// Mesma lógica de Expense: boleto pago debita conta; reversão credita.
// OVERDUE tratado como PENDING para fins de saldo (ainda não debitado).
async function applyBillBalanceAdjustment(
  tx: Prisma.TransactionClient,
  oldStatus: string,
  oldAccountId: string | null,
  oldAmount: number,
  newStatus: string,
  newAccountId: string | null | undefined,
  newAmount: number,
): Promise<void> {
  const wasDebited = oldStatus === 'PAID'
  const willDebit = newStatus === 'PAID'

  if (wasDebited && willDebit) {
    if (oldAccountId === newAccountId) {
      const diff = oldAmount - newAmount
      if (diff !== 0) {
        await tx.account.update({
          where: { id: oldAccountId! },
          data: { currentBalance: { increment: diff } },
        })
      }
    } else {
      if (oldAccountId) {
        await tx.account.update({
          where: { id: oldAccountId },
          data: { currentBalance: { increment: oldAmount } },
        })
      }
      if (newAccountId) {
        await tx.account.update({
          where: { id: newAccountId },
          data: { currentBalance: { decrement: newAmount } },
        })
      }
    }
  } else if (wasDebited && !willDebit) {
    if (oldAccountId) {
      await tx.account.update({
        where: { id: oldAccountId },
        data: { currentBalance: { increment: oldAmount } },
      })
    }
  } else if (!wasDebited && willDebit) {
    if (newAccountId) {
      await tx.account.update({
        where: { id: newAccountId },
        data: { currentBalance: { decrement: newAmount } },
      })
    }
  }
  // PENDING/OVERDUE → PENDING/OVERDUE: sem alteração de saldo
}

// ── Service ──────────────────────────────────────────────────────────────────

export const BillService = {
  async list(companyId: string, query: ListBillsQuery) {
    const { page, limit, search, status, supplierId, accountId, billGroupId, dateFrom, dateTo } =
      query
    const { skip, take } = getPaginationArgs({ page, limit })

    const where = {
      companyId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(supplierId ? { supplierId } : {}),
      ...(accountId ? { accountId } : {}),
      ...(billGroupId ? { billGroupId } : {}),
      ...(search
        ? { description: { contains: search, mode: 'insensitive' as const } }
        : {}),
      ...(dateFrom || dateTo
        ? {
            dueDate: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        select: BILL_SELECT,
        orderBy: { dueDate: 'asc' },
        skip,
        take,
      }),
      prisma.bill.count({ where }),
    ])

    return buildPaginatedResponse(data, total, { page, limit })
  },

  async findById(companyId: string, id: string) {
    const bill = await prisma.bill.findFirst({
      where: { id, companyId, deletedAt: null },
      select: BILL_SELECT,
    })
    if (!bill) throw AppError.notFound('Boleto')
    return bill
  },

  async create(companyId: string, data: CreateBillDto, req: Request) {
    const validations: Promise<void>[] = []
    if (data.supplierId) validations.push(validateSupplierId(companyId, data.supplierId))
    if (data.accountId) validations.push(validateAccountId(companyId, data.accountId))
    if (data.billGroupId) validations.push(validateBillGroupId(companyId, data.billGroupId))
    await Promise.all(validations)

    const bill = await prisma.$transaction(async (tx) => {
      const created = await tx.bill.create({
        data: { ...data, companyId },
        select: BILL_SELECT,
      })

      if (data.status === 'PAID' && data.accountId) {
        await tx.account.update({
          where: { id: data.accountId },
          data: { currentBalance: { decrement: data.amount } },
        })
      }

      return created
    })

    await writeAuditLog(req, {
      action: AuditAction.CREATE,
      entityType: 'Bill',
      entityId: bill.id,
      after: bill,
    })

    return bill
  },

  async createInstallments(companyId: string, data: CreateBillInstallmentsDto, req: Request) {
    const validations: Promise<void>[] = []
    if (data.supplierId) validations.push(validateSupplierId(companyId, data.supplierId))
    if (data.accountId) validations.push(validateAccountId(companyId, data.accountId))
    await Promise.all(validations)

    const amounts = distributeInstallmentAmounts(data.totalAmount, data.installmentCount)

    const result = await prisma.$transaction(async (tx) => {
      const group = await tx.billGroup.create({
        data: {
          companyId,
          supplierId: data.supplierId,
          description: data.description,
          totalAmount: data.totalAmount,
          installmentCount: data.installmentCount,
        },
        select: BILL_GROUP_SELECT,
      })

      const bills = []
      for (let index = 0; index < data.installmentCount; index += 1) {
        const bill = await tx.bill.create({
          data: {
            companyId,
            billGroupId: group.id,
            supplierId: data.supplierId,
            accountId: data.accountId,
            description: data.description,
            amount: amounts[index],
            dueDate: addMonthsClamped(data.firstDueDate, index),
            status: 'PENDING',
            installmentNumber: index + 1,
            installmentCount: data.installmentCount,
            fileUrl: data.fileUrl,
          },
          select: BILL_SELECT,
        })
        bills.push(bill)
      }

      return { group, bills }
    })

    await writeAuditLog(req, {
      action: AuditAction.CREATE,
      entityType: 'BillGroup',
      entityId: result.group.id,
      after: result,
    })

    return result
  },

  async update(companyId: string, id: string, data: UpdateBillDto, req: Request) {
    const existing = await BillService.findById(companyId, id)

    const newStatus = data.status ?? existing.status
    const newAccountId = data.accountId !== undefined ? data.accountId : existing.accountId
    const newAmount = data.amount !== undefined ? data.amount : Number(existing.amount)

    if (newStatus === 'PAID' && !newAccountId) {
      throw AppError.badRequest('accountId é obrigatório quando status é PAID')
    }

    const validations: Promise<void>[] = []
    if (data.supplierId != null && data.supplierId !== existing.supplierId) {
      validations.push(validateSupplierId(companyId, data.supplierId))
    }
    if (data.accountId != null && data.accountId !== existing.accountId) {
      validations.push(validateAccountId(companyId, data.accountId))
    }
    if (data.billGroupId != null && data.billGroupId !== existing.billGroupId) {
      validations.push(validateBillGroupId(companyId, data.billGroupId))
    }
    await Promise.all(validations)

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.bill.update({
        where: { id },
        data,
        select: BILL_SELECT,
      })

      await applyBillBalanceAdjustment(
        tx,
        existing.status,
        existing.accountId,
        Number(existing.amount),
        newStatus,
        newAccountId,
        newAmount,
      )

      return result
    })

    await writeAuditLog(req, {
      action: AuditAction.UPDATE,
      entityType: 'Bill',
      entityId: id,
      before: existing,
      after: updated,
    })

    return updated
  },

  async delete(companyId: string, id: string, req: Request) {
    const existing = await BillService.findById(companyId, id)

    await prisma.$transaction(async (tx) => {
      await tx.bill.update({
        where: { id },
        data: { deletedAt: new Date() },
      })

      if (existing.status === 'PAID' && existing.accountId) {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { currentBalance: { increment: Number(existing.amount) } },
        })
      }
    })

    await writeAuditLog(req, {
      action: AuditAction.DELETE,
      entityType: 'Bill',
      entityId: id,
      before: existing,
    })
  },
}
