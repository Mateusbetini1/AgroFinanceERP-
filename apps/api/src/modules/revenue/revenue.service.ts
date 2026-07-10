import type { Request } from 'express'
import type { Prisma } from '@agrofinance/database'
import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import { getPaginationArgs, buildPaginatedResponse } from '../../shared/utils/pagination'
import { writeAuditLog } from '../../shared/middleware/audit-log'
import { AuditAction } from '@agrofinance/shared'
import type { CreateRevenueDto, UpdateRevenueDto, ListRevenuesQuery } from './revenue.schemas'

const REVENUE_SELECT = {
  id: true,
  productId: true,
  product: { select: { id: true, name: true } },
  accountId: true,
  account: { select: { id: true, name: true, type: true } },
  safraId: true,
  safra: { select: { id: true, name: true } },
  date: true,
  receivedAt: true,
  quantity: true,
  unitPrice: true,
  totalAmount: true,
  client: true,
  notes: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const

// ── FK validators ────────────────────────────────────────────────────────────

async function validateProductId(companyId: string, productId: string): Promise<void> {
  const exists = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    select: { id: true },
  })
  if (!exists) throw AppError.notFound('Produto')
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

// Aplica os ajustes de currentBalance dentro de uma transação Prisma.
// Lógica: reverte o estado anterior (se RECEIVED) e aplica o novo (se RECEIVED).
// Quando old e new apontam para a mesma conta, aplica apenas a diferença.
async function applyBalanceAdjustment(
  tx: Prisma.TransactionClient,
  oldStatus: string,
  oldAccountId: string | null,
  oldTotal: number,
  newStatus: string,
  newAccountId: string | null | undefined,
  newTotal: number,
): Promise<void> {
  if (oldStatus === 'RECEIVED' && newStatus === 'RECEIVED') {
    if (oldAccountId === newAccountId) {
      const diff = newTotal - oldTotal
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
          data: { currentBalance: { decrement: oldTotal } },
        })
      }
      if (newAccountId) {
        await tx.account.update({
          where: { id: newAccountId },
          data: { currentBalance: { increment: newTotal } },
        })
      }
    }
  } else if (oldStatus === 'RECEIVED' && newStatus === 'PENDING') {
    if (oldAccountId) {
      await tx.account.update({
        where: { id: oldAccountId },
        data: { currentBalance: { decrement: oldTotal } },
      })
    }
  } else if (oldStatus === 'PENDING' && newStatus === 'RECEIVED') {
    if (newAccountId) {
      await tx.account.update({
        where: { id: newAccountId },
        data: { currentBalance: { increment: newTotal } },
      })
    }
  }
  // PENDING → PENDING: sem alteração de saldo
}

// ── Service ──────────────────────────────────────────────────────────────────

export const RevenueService = {
  async list(companyId: string, query: ListRevenuesQuery) {
    const { page, limit, search, status, productId, accountId, dateFrom, dateTo } = query
    const { skip, take } = getPaginationArgs({ page, limit })

    const where = {
      companyId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(productId ? { productId } : {}),
      ...(accountId ? { accountId } : {}),
      ...(search ? { client: { contains: search, mode: 'insensitive' as const } } : {}),
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
      prisma.revenue.findMany({
        where,
        select: REVENUE_SELECT,
        orderBy: { date: 'desc' },
        skip,
        take,
      }),
      prisma.revenue.count({ where }),
    ])

    return buildPaginatedResponse(data, total, { page, limit })
  },

  async findById(companyId: string, id: string) {
    const revenue = await prisma.revenue.findFirst({
      where: { id, companyId, deletedAt: null },
      select: REVENUE_SELECT,
    })
    if (!revenue) throw AppError.notFound('Receita')
    return revenue
  },

  async create(companyId: string, data: CreateRevenueDto, req: Request) {
    const totalAmount = data.quantity * data.unitPrice

    const validations: Promise<void>[] = [validateProductId(companyId, data.productId)]
    if (data.accountId) validations.push(validateAccountId(companyId, data.accountId))
    if (data.safraId) validations.push(validateSafraId(companyId, data.safraId))
    await Promise.all(validations)

    const revenue = await prisma.$transaction(async (tx) => {
      const created = await tx.revenue.create({
        data: { ...data, companyId, totalAmount },
        select: REVENUE_SELECT,
      })

      if (data.status === 'RECEIVED' && data.accountId) {
        await tx.account.update({
          where: { id: data.accountId },
          data: { currentBalance: { increment: totalAmount } },
        })
      }

      return created
    })

    await writeAuditLog(req, {
      action: AuditAction.CREATE,
      entityType: 'Revenue',
      entityId: revenue.id,
      after: revenue,
    })

    return revenue
  },

  async update(companyId: string, id: string, data: UpdateRevenueDto, req: Request) {
    const existing = await RevenueService.findById(companyId, id)

    // Estado efetivo pós-atualização
    const newStatus = data.status ?? existing.status
    // undefined = sem mudança; null = limpar; uuid = trocar
    const newAccountId = data.accountId !== undefined ? data.accountId : existing.accountId
    const newQuantity =
      data.quantity !== undefined ? data.quantity : Number(existing.quantity)
    const newUnitPrice =
      data.unitPrice !== undefined ? data.unitPrice : Number(existing.unitPrice)
    const newTotalAmount = newQuantity * newUnitPrice

    if (newStatus === 'RECEIVED' && !newAccountId) {
      throw AppError.badRequest('accountId é obrigatório quando status é RECEIVED')
    }

    // Valida FKs que mudaram
    const validations: Promise<void>[] = []
    if (data.productId !== undefined && data.productId !== existing.productId) {
      validations.push(validateProductId(companyId, data.productId))
    }
    if (data.accountId != null && data.accountId !== existing.accountId) {
      validations.push(validateAccountId(companyId, data.accountId))
    }
    if (data.safraId != null && data.safraId !== existing.safraId) {
      validations.push(validateSafraId(companyId, data.safraId))
    }
    await Promise.all(validations)

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.revenue.update({
        where: { id },
        data: { ...data, totalAmount: newTotalAmount },
        select: REVENUE_SELECT,
      })

      await applyBalanceAdjustment(
        tx,
        existing.status,
        existing.accountId,
        Number(existing.totalAmount),
        newStatus,
        newAccountId,
        newTotalAmount,
      )

      return result
    })

    await writeAuditLog(req, {
      action: AuditAction.UPDATE,
      entityType: 'Revenue',
      entityId: id,
      before: existing,
      after: updated,
    })

    return updated
  },

  async delete(companyId: string, id: string, req: Request) {
    const existing = await RevenueService.findById(companyId, id)

    await prisma.$transaction(async (tx) => {
      await tx.revenue.update({
        where: { id },
        data: { deletedAt: new Date() },
      })

      if (existing.status === 'RECEIVED' && existing.accountId) {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { currentBalance: { decrement: Number(existing.totalAmount) } },
        })
      }
    })

    await writeAuditLog(req, {
      action: AuditAction.DELETE,
      entityType: 'Revenue',
      entityId: id,
      before: existing,
    })
  },
}
