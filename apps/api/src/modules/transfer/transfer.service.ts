import type { Request } from 'express'
import type { Prisma } from '@agrofinance/database'
import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import { getPaginationArgs, buildPaginatedResponse } from '../../shared/utils/pagination'
import { writeAuditLog } from '../../shared/middleware/audit-log'
import { AuditAction } from '@agrofinance/shared'
import type { CreateTransferDto, UpdateTransferDto, ListTransfersQuery } from './transfer.schemas'

const TRANSFER_SELECT = {
  id: true,
  fromAccountId: true,
  fromAccount: { select: { id: true, name: true, type: true } },
  toAccountId: true,
  toAccount: { select: { id: true, name: true, type: true } },
  amount: true,
  description: true,
  date: true,
  createdAt: true,
  updatedAt: true,
} as const

type TransferSnapshot = {
  fromAccountId: string
  toAccountId: string
  amount: Prisma.Decimal | number
}

async function getActiveAccount(
  tx: Prisma.TransactionClient,
  companyId: string,
  accountId: string,
  label: string,
) {
  const account = await tx.account.findFirst({
    where: { id: accountId, companyId, deletedAt: null, active: true },
    select: { id: true, currentBalance: true },
  })

  if (!account) throw AppError.notFound(label)
  return account
}

function ensureDifferentAccounts(fromAccountId: string, toAccountId: string): void {
  if (fromAccountId === toAccountId) {
    throw AppError.badRequest('Conta de origem e destino devem ser diferentes')
  }
}

function ensureSufficientBalance(currentBalance: Prisma.Decimal | number, amount: number): void {
  if (Number(currentBalance) < amount) {
    throw AppError.conflict('Saldo insuficiente na conta de origem')
  }
}

async function reverseTransfer(tx: Prisma.TransactionClient, transfer: TransferSnapshot): Promise<void> {
  const amount = Number(transfer.amount)

  await tx.account.update({
    where: { id: transfer.fromAccountId },
    data: { currentBalance: { increment: amount } },
  })

  await tx.account.update({
    where: { id: transfer.toAccountId },
    data: { currentBalance: { decrement: amount } },
  })
}

async function applyTransfer(
  tx: Prisma.TransactionClient,
  companyId: string,
  fromAccountId: string,
  toAccountId: string,
  amount: number,
): Promise<void> {
  ensureDifferentAccounts(fromAccountId, toAccountId)

  const fromAccount = await getActiveAccount(tx, companyId, fromAccountId, 'Conta de origem')
  await getActiveAccount(tx, companyId, toAccountId, 'Conta de destino')

  ensureSufficientBalance(fromAccount.currentBalance, amount)

  await tx.account.update({
    where: { id: fromAccountId },
    data: { currentBalance: { decrement: amount } },
  })

  await tx.account.update({
    where: { id: toAccountId },
    data: { currentBalance: { increment: amount } },
  })
}

export const TransferService = {
  async listTransfers(companyId: string, query: ListTransfersQuery) {
    const { page, limit, fromAccountId, toAccountId, dateFrom, dateTo } = query
    const { skip, take } = getPaginationArgs({ page, limit })

    const where = {
      companyId,
      deletedAt: null,
      ...(fromAccountId ? { fromAccountId } : {}),
      ...(toAccountId ? { toAccountId } : {}),
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
      prisma.transfer.findMany({
        where,
        select: TRANSFER_SELECT,
        orderBy: { date: 'desc' },
        skip,
        take,
      }),
      prisma.transfer.count({ where }),
    ])

    return buildPaginatedResponse(data, total, { page, limit })
  },

  async getTransferById(companyId: string, id: string) {
    const transfer = await prisma.transfer.findFirst({
      where: { id, companyId, deletedAt: null },
      select: TRANSFER_SELECT,
    })

    if (!transfer) throw AppError.notFound('Transferencia')
    return transfer
  },

  async createTransfer(companyId: string, data: CreateTransferDto, req: Request) {
    const transfer = await prisma.$transaction(async (tx) => {
      await applyTransfer(tx, companyId, data.fromAccountId, data.toAccountId, data.amount)

      return tx.transfer.create({
        data: { ...data, companyId },
        select: TRANSFER_SELECT,
      })
    })

    await writeAuditLog(req, {
      action: AuditAction.CREATE,
      entityType: 'Transfer',
      entityId: transfer.id,
      after: transfer,
    })

    return transfer
  },

  async updateTransfer(companyId: string, id: string, data: UpdateTransferDto, req: Request) {
    const existing = await TransferService.getTransferById(companyId, id)

    const next = {
      fromAccountId: data.fromAccountId ?? existing.fromAccountId,
      toAccountId: data.toAccountId ?? existing.toAccountId,
      amount: data.amount ?? Number(existing.amount),
    }

    ensureDifferentAccounts(next.fromAccountId, next.toAccountId)

    const updated = await prisma.$transaction(async (tx) => {
      await reverseTransfer(tx, existing)
      await applyTransfer(tx, companyId, next.fromAccountId, next.toAccountId, next.amount)

      return tx.transfer.update({
        where: { id },
        data,
        select: TRANSFER_SELECT,
      })
    })

    await writeAuditLog(req, {
      action: AuditAction.UPDATE,
      entityType: 'Transfer',
      entityId: id,
      before: existing,
      after: updated,
    })

    return updated
  },

  async deleteTransfer(companyId: string, id: string, req: Request) {
    const existing = await TransferService.getTransferById(companyId, id)

    await prisma.$transaction(async (tx) => {
      await reverseTransfer(tx, existing)
      await tx.transfer.update({
        where: { id },
        data: { deletedAt: new Date() },
      })
    })

    await writeAuditLog(req, {
      action: AuditAction.DELETE,
      entityType: 'Transfer',
      entityId: id,
      before: existing,
    })
  },
}
