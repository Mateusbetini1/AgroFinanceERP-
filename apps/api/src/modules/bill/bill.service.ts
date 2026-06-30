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
  CreateRecurringBillsDto,
  UpdateBillDto,
  ListBillsQuery,
  ListBillGroupsQuery,
  BillGroupStatus,
} from './bill.schemas'

const BILL_SELECT = {
  id: true,
  billGroupId: true,
  categoryId: true,
  category: { select: { id: true, name: true, type: true } },
  supplierId: true,
  supplier: { select: { id: true, name: true } },
  accountId: true,
  account: { select: { id: true, name: true, type: true } },
  safraId: true,
  safra: { select: { id: true, name: true } },
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
  supplier: { select: { id: true, name: true } },
  description: true,
  totalAmount: true,
  installmentCount: true,
  createdAt: true,
  updatedAt: true,
} as const

const BILL_GROUP_INSTALLMENT_SELECT = {
  id: true,
  categoryId: true,
  category: { select: { id: true, name: true, type: true } },
  supplierId: true,
  supplier: { select: { id: true, name: true } },
  accountId: true,
  account: { select: { id: true, name: true, type: true } },
  safraId: true,
  safra: { select: { id: true, name: true } },
  description: true,
  amount: true,
  dueDate: true,
  paidAt: true,
  status: true,
  installmentNumber: true,
  installmentCount: true,
} as const

type BillGroupWithInstallments = Prisma.BillGroupGetPayload<{
  select: typeof BILL_GROUP_SELECT & {
    bills: { where: { deletedAt: null }; select: typeof BILL_GROUP_INSTALLMENT_SELECT }
  }
}>

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

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function isUnpaidOverdue(installment: { status: string; dueDate: Date }): boolean {
  return installment.status === 'OVERDUE' || (installment.status === 'PENDING' && installment.dueDate < startOfToday())
}

function summarizeBillGroup(group: BillGroupWithInstallments) {
  const activeInstallments = group.bills.length
  const paidInstallments = group.bills.filter((bill) => bill.status === 'PAID').length
  const pendingInstallments = group.bills.filter((bill) => bill.status === 'PENDING').length
  const overdueInstallments = group.bills.filter(isUnpaidOverdue).length
  const unpaidInstallments = group.bills.filter((bill) => bill.status !== 'PAID')

  const activeTotalAmount = group.bills.reduce((total, bill) => total + Number(bill.amount), 0)
  const paidAmount = group.bills
    .filter((bill) => bill.status === 'PAID')
    .reduce((total, bill) => total + Number(bill.amount), 0)
  const pendingAmount = group.bills
    .filter((bill) => bill.status === 'PENDING' || bill.status === 'OVERDUE')
    .reduce((total, bill) => total + Number(bill.amount), 0)

  const nextDueDate =
    unpaidInstallments.length > 0
      ? unpaidInstallments
          .map((bill) => bill.dueDate)
          .sort((a, b) => a.getTime() - b.getTime())[0]
      : null

  let status: BillGroupStatus = 'PENDING'
  if (overdueInstallments > 0) {
    status = 'OVERDUE'
  } else if (activeInstallments > 0 && paidInstallments === activeInstallments) {
    status = 'PAID'
  } else if (paidInstallments > 0 && unpaidInstallments.length > 0) {
    status = 'IN_PROGRESS'
  }

  const categoryIds = new Set(group.bills.map((bill) => bill.categoryId ?? null))
  const safraIds = new Set(group.bills.map((bill) => bill.safraId ?? null))
  const categoryMixed = categoryIds.size > 1
  const safraMixed = safraIds.size > 1
  const category = categoryMixed ? null : group.bills[0]?.category ?? null
  const safra = safraMixed ? null : group.bills[0]?.safra ?? null

  return {
    id: group.id,
    description: group.description,
    supplier: group.supplier,
    category,
    categoryMixed,
    safra,
    safraMixed,
    totalAmount: Number(group.totalAmount),
    activeTotalAmount,
    paidAmount,
    pendingAmount,
    installmentCount: group.installmentCount,
    activeInstallments,
    paidInstallments,
    pendingInstallments,
    overdueInstallments,
    deletedInstallments: Math.max(group.installmentCount - activeInstallments, 0),
    nextDueDate,
    status,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  }
}

function sortInstallments(
  installments: BillGroupWithInstallments['bills'],
): BillGroupWithInstallments['bills'] {
  return [...installments].sort((a, b) => {
    const aNumber = a.installmentNumber ?? Number.MAX_SAFE_INTEGER
    const bNumber = b.installmentNumber ?? Number.MAX_SAFE_INTEGER
    if (aNumber !== bNumber) return aNumber - bNumber
    return a.dueDate.getTime() - b.dueDate.getTime()
  })
}

async function validateSupplierId(companyId: string, supplierId: string): Promise<void> {
  const exists = await prisma.supplier.findFirst({
    where: { id: supplierId, companyId, deletedAt: null },
    select: { id: true },
  })
  if (!exists) throw AppError.notFound('Fornecedor')
}

async function validateCategoryId(companyId: string, categoryId: string): Promise<void> {
  const exists = await prisma.category.findFirst({
    where: { id: categoryId, companyId, deletedAt: null, type: { in: ['EXPENSE', 'BOTH'] } },
    select: { id: true },
  })
  if (!exists) throw AppError.notFound('Categoria')
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
    const { page, limit, search, status, supplierId, accountId, billGroupId, categoryId, safraId, dateFrom, dateTo } =
      query
    const { skip, take } = getPaginationArgs({ page, limit })

    const where = {
      companyId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(supplierId ? { supplierId } : {}),
      ...(accountId ? { accountId } : {}),
      ...(billGroupId ? { billGroupId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(safraId ? { safraId } : {}),
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

  async listGroups(companyId: string, query: ListBillGroupsQuery) {
    const { page, limit, search, supplierId, status } = query

    const groups = await prisma.billGroup.findMany({
      where: {
        companyId,
        ...(supplierId ? { supplierId } : {}),
        ...(search
          ? { description: { contains: search, mode: 'insensitive' as const } }
          : {}),
        bills: { some: { companyId, deletedAt: null } },
      },
      select: {
        ...BILL_GROUP_SELECT,
        bills: {
          where: { deletedAt: null },
          select: BILL_GROUP_INSTALLMENT_SELECT,
          orderBy: [{ installmentNumber: 'asc' }, { dueDate: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const summaries = groups
      .map(summarizeBillGroup)
      .filter((group) => group.activeInstallments > 0)
      .filter((group) => !status || group.status === status)

    const start = (page - 1) * limit
    const data = summaries.slice(start, start + limit)

    return buildPaginatedResponse(data, summaries.length, { page, limit })
  },

  async findGroupById(companyId: string, id: string) {
    const group = await prisma.billGroup.findFirst({
      where: {
        id,
        companyId,
        bills: { some: { companyId, deletedAt: null } },
      },
      select: {
        ...BILL_GROUP_SELECT,
        bills: {
          where: { deletedAt: null },
          select: BILL_GROUP_INSTALLMENT_SELECT,
          orderBy: [{ installmentNumber: 'asc' }, { dueDate: 'asc' }],
        },
      },
    })

    if (!group || group.bills.length === 0) throw AppError.notFound('Grupo de boletos')

    return {
      summary: summarizeBillGroup(group),
      installments: sortInstallments(group.bills),
    }
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
    if (data.categoryId) validations.push(validateCategoryId(companyId, data.categoryId))
    if (data.supplierId) validations.push(validateSupplierId(companyId, data.supplierId))
    if (data.accountId) validations.push(validateAccountId(companyId, data.accountId))
    if (data.safraId) validations.push(validateSafraId(companyId, data.safraId))
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
    if (data.categoryId) validations.push(validateCategoryId(companyId, data.categoryId))
    if (data.supplierId) validations.push(validateSupplierId(companyId, data.supplierId))
    if (data.accountId) validations.push(validateAccountId(companyId, data.accountId))
    if (data.safraId) validations.push(validateSafraId(companyId, data.safraId))
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
            categoryId: data.categoryId,
            supplierId: data.supplierId,
            accountId: data.accountId,
            safraId: data.safraId,
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

  async createRecurringBills(companyId: string, data: CreateRecurringBillsDto, req: Request) {
    const validations: Promise<void>[] = []
    if (data.categoryId) validations.push(validateCategoryId(companyId, data.categoryId))
    if (data.supplierId) validations.push(validateSupplierId(companyId, data.supplierId))
    if (data.accountId) validations.push(validateAccountId(companyId, data.accountId))
    if (data.safraId) validations.push(validateSafraId(companyId, data.safraId))
    await Promise.all(validations)

    const dueDates = Array.from({ length: data.months }, (_, index) =>
      addMonthsClamped(data.firstDueDate, index),
    )

    const result = await prisma.$transaction(async (tx) => {
      const created = []
      const skipped: Array<{ dueDate: Date; reason: 'DUPLICATE'; existingBillId: string }> = []

      for (const dueDate of dueDates) {
        if (data.skipExisting) {
          const duplicate = await tx.bill.findFirst({
            where: {
              companyId,
              deletedAt: null,
              billGroupId: null,
              description: data.description,
              supplierId: data.supplierId ?? null,
              accountId: data.accountId ?? null,
              categoryId: data.categoryId ?? null,
              safraId: data.safraId ?? null,
              amount: data.amount,
              dueDate,
              status: { in: ['PENDING', 'OVERDUE'] },
            },
            select: { id: true },
          })

          if (duplicate) {
            skipped.push({ dueDate, reason: 'DUPLICATE', existingBillId: duplicate.id })
            continue
          }
        }

        const bill = await tx.bill.create({
          data: {
            companyId,
            categoryId: data.categoryId,
            supplierId: data.supplierId,
            accountId: data.accountId,
            safraId: data.safraId,
            description: data.description,
            amount: data.amount,
            dueDate,
            status: 'PENDING',
            billGroupId: null,
            installmentNumber: null,
            installmentCount: null,
          },
          select: BILL_SELECT,
        })
        created.push(bill)
      }

      return {
        created,
        skipped,
        countCreated: created.length,
        countSkipped: skipped.length,
      }
    })

    await writeAuditLog(req, {
      action: AuditAction.CREATE,
      entityType: 'Bill',
      entityId: 'recurring-generate',
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
    if (data.categoryId != null && data.categoryId !== existing.categoryId) {
      validations.push(validateCategoryId(companyId, data.categoryId))
    }
    if (data.supplierId != null && data.supplierId !== existing.supplierId) {
      validations.push(validateSupplierId(companyId, data.supplierId))
    }
    if (data.accountId != null && data.accountId !== existing.accountId) {
      validations.push(validateAccountId(companyId, data.accountId))
    }
    if (data.billGroupId != null && data.billGroupId !== existing.billGroupId) {
      validations.push(validateBillGroupId(companyId, data.billGroupId))
    }
    if (data.safraId != null && data.safraId !== existing.safraId) {
      validations.push(validateSafraId(companyId, data.safraId))
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
