import type { Request } from 'express'
import type { Prisma } from '@agrofinance/database'
import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import { getPaginationArgs, buildPaginatedResponse } from '../../shared/utils/pagination'
import { writeAuditLog } from '../../shared/middleware/audit-log'
import { AuditAction } from '@agrofinance/shared'
import type { CreateExpenseDto, UpdateExpenseDto, ListExpensesQuery } from './expense.schemas'

const EXPENSE_SELECT = {
  id: true,
  categoryId: true,
  category: { select: { id: true, name: true, type: true } },
  supplierId: true,
  supplier: { select: { id: true, name: true } },
  accountId: true,
  account: { select: { id: true, name: true, type: true } },
  safraId: true,
  safra: { select: { id: true, name: true } },
  date: true,
  dueDate: true,
  paidAt: true,
  amount: true,
  description: true,
  status: true,
  attachmentUrl: true,
  createdAt: true,
  updatedAt: true,
} as const

// ── FK validators ────────────────────────────────────────────────────────────

async function validateCategoryId(companyId: string, categoryId: string): Promise<void> {
  const exists = await prisma.category.findFirst({
    where: { id: categoryId, companyId, deletedAt: null },
    select: { id: true },
  })
  if (!exists) throw AppError.notFound('Categoria')
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

async function validateSafraId(companyId: string, safraId: string): Promise<void> {
  const exists = await prisma.safra.findFirst({
    where: { id: safraId, companyId, deletedAt: null },
    select: { id: true },
  })
  if (!exists) throw AppError.notFound('Safra')
}

// ── Balance helper ───────────────────────────────────────────────────────────

// Inverte a lógica de Revenue: despesa debita; reversão credita.
// OVERDUE é tratado como PENDING para fins de saldo (ainda não foi debitado).
async function applyExpenseBalanceAdjustment(
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
      // Mesma conta: aplica o diferencial (crédito se valor caiu, débito extra se subiu)
      const diff = oldAmount - newAmount
      if (diff !== 0) {
        await tx.account.update({
          where: { id: oldAccountId! },
          data: { currentBalance: { increment: diff } },
        })
      }
    } else {
      // Contas diferentes: reverte débito da conta antiga, debita da nova
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
    // PAID → PENDING: credita de volta
    if (oldAccountId) {
      await tx.account.update({
        where: { id: oldAccountId },
        data: { currentBalance: { increment: oldAmount } },
      })
    }
  } else if (!wasDebited && willDebit) {
    // PENDING/OVERDUE → PAID: debita
    if (newAccountId) {
      await tx.account.update({
        where: { id: newAccountId },
        data: { currentBalance: { decrement: newAmount } },
      })
    }
  }
  // PENDING → PENDING / OVERDUE → OVERDUE: sem alteração de saldo
}

// ── Service ──────────────────────────────────────────────────────────────────

export const ExpenseService = {
  async list(companyId: string, query: ListExpensesQuery) {
    const { page, limit, search, status, categoryId, supplierId, accountId, dateFrom, dateTo } =
      query
    const { skip, take } = getPaginationArgs({ page, limit })

    const where = {
      companyId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(supplierId ? { supplierId } : {}),
      ...(accountId ? { accountId } : {}),
      ...(search
        ? { description: { contains: search, mode: 'insensitive' as const } }
        : {}),
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
      prisma.expense.findMany({
        where,
        select: EXPENSE_SELECT,
        orderBy: { date: 'desc' },
        skip,
        take,
      }),
      prisma.expense.count({ where }),
    ])

    return buildPaginatedResponse(data, total, { page, limit })
  },

  async findById(companyId: string, id: string) {
    const expense = await prisma.expense.findFirst({
      where: { id, companyId, deletedAt: null },
      select: EXPENSE_SELECT,
    })
    if (!expense) throw AppError.notFound('Despesa')
    return expense
  },

  async create(companyId: string, data: CreateExpenseDto, req: Request) {
    const validations: Promise<void>[] = [validateCategoryId(companyId, data.categoryId)]
    if (data.supplierId) validations.push(validateSupplierId(companyId, data.supplierId))
    if (data.accountId) validations.push(validateAccountId(companyId, data.accountId))
    if (data.safraId) validations.push(validateSafraId(companyId, data.safraId))
    await Promise.all(validations)

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: { ...data, companyId },
        select: EXPENSE_SELECT,
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
      entityType: 'Expense',
      entityId: expense.id,
      after: expense,
    })

    return expense
  },

  async update(companyId: string, id: string, data: UpdateExpenseDto, req: Request) {
    const existing = await ExpenseService.findById(companyId, id)

    // Estado efetivo pós-atualização
    const newStatus = data.status ?? existing.status
    const newAccountId = data.accountId !== undefined ? data.accountId : existing.accountId
    const newAmount = data.amount !== undefined ? data.amount : Number(existing.amount)

    if (newStatus === 'PAID' && !newAccountId) {
      throw AppError.badRequest('accountId é obrigatório quando status é PAID')
    }

    // Valida FKs que mudaram
    const validations: Promise<void>[] = []
    if (data.categoryId !== undefined && data.categoryId !== existing.categoryId) {
      validations.push(validateCategoryId(companyId, data.categoryId))
    }
    if (data.supplierId != null && data.supplierId !== existing.supplierId) {
      validations.push(validateSupplierId(companyId, data.supplierId))
    }
    if (data.accountId != null && data.accountId !== existing.accountId) {
      validations.push(validateAccountId(companyId, data.accountId))
    }
    if (data.safraId != null && data.safraId !== existing.safraId) {
      validations.push(validateSafraId(companyId, data.safraId))
    }
    await Promise.all(validations)

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.expense.update({
        where: { id },
        data,
        select: EXPENSE_SELECT,
      })

      await applyExpenseBalanceAdjustment(
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
      entityType: 'Expense',
      entityId: id,
      before: existing,
      after: updated,
    })

    return updated
  },

  async delete(companyId: string, id: string, req: Request) {
    const existing = await ExpenseService.findById(companyId, id)

    await prisma.$transaction(async (tx) => {
      await tx.expense.update({
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
      entityType: 'Expense',
      entityId: id,
      before: existing,
    })
  },
}
