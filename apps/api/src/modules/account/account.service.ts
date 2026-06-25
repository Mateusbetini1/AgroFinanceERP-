import type { Request } from 'express'
import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import { getPaginationArgs, buildPaginatedResponse } from '../../shared/utils/pagination'
import { writeAuditLog } from '../../shared/middleware/audit-log'
import { AuditAction } from '@agrofinance/shared'
import type { CreateAccountDto, UpdateAccountDto, ListAccountsQuery } from './account.schemas'

const ACCOUNT_SELECT = {
  id: true,
  name: true,
  type: true,
  bankName: true,
  agency: true,
  accountNumber: true,
  initialBalance: true,
  currentBalance: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const

async function checkNameConflict(
  companyId: string,
  name: string,
  excludeId?: string,
): Promise<void> {
  const conflict = await prisma.account.findFirst({
    where: {
      companyId,
      name: { equals: name, mode: 'insensitive' },
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  })
  if (conflict) {
    throw AppError.conflict(`Já existe uma conta com o nome "${name}"`)
  }
}

async function checkDependencies(companyId: string, id: string): Promise<void> {
  const [
    revenueCount,
    expenseCount,
    billCount,
    employeePaymentCount,
    transferFromCount,
    transferToCount,
  ] = await Promise.all([
    prisma.revenue.count({ where: { companyId, accountId: id, deletedAt: null } }),
    prisma.expense.count({ where: { companyId, accountId: id, deletedAt: null } }),
    prisma.bill.count({ where: { companyId, accountId: id, deletedAt: null } }),
    prisma.employeePayment.count({ where: { companyId, accountId: id, deletedAt: null } }),
    prisma.transfer.count({ where: { companyId, fromAccountId: id, deletedAt: null } }),
    prisma.transfer.count({ where: { companyId, toAccountId: id, deletedAt: null } }),
  ])

  const deps: string[] = []
  if (revenueCount > 0) deps.push(revenueCount + ' receita(s)')
  if (expenseCount > 0) deps.push(expenseCount + ' despesa(s)')
  if (billCount > 0) deps.push(billCount + ' boleto(s)')
  if (employeePaymentCount > 0) deps.push(employeePaymentCount + ' pagamento(s) de funcionario')
  if (transferFromCount > 0) deps.push(transferFromCount + ' transferencia(s) de origem')
  if (transferToCount > 0) deps.push(transferToCount + ' transferencia(s) de destino')

  if (deps.length > 0) {
    throw AppError.conflict(
      'Conta nao pode ser removida pois esta vinculada a: ' + deps.join(', '),
    )
  }
}

export const AccountService = {
  async list(companyId: string, query: ListAccountsQuery) {
    const { page, limit, search, active, type } = query
    const { skip, take } = getPaginationArgs({ page, limit })

    const where = {
      companyId,
      deletedAt: null,
      ...(active !== undefined ? { active } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.account.findMany({
        where,
        select: ACCOUNT_SELECT,
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      prisma.account.count({ where }),
    ])

    return buildPaginatedResponse(data, total, { page, limit })
  },

  async findById(companyId: string, id: string) {
    const account = await prisma.account.findFirst({
      where: { id, companyId, deletedAt: null },
      select: ACCOUNT_SELECT,
    })
    if (!account) throw AppError.notFound('Conta')
    return account
  },

  async create(companyId: string, data: CreateAccountDto, req: Request) {
    await checkNameConflict(companyId, data.name)

    const account = await prisma.account.create({
      data: {
        ...data,
        companyId,
        currentBalance: data.initialBalance,
      },
      select: ACCOUNT_SELECT,
    })

    await writeAuditLog(req, {
      action: AuditAction.CREATE,
      entityType: 'Account',
      entityId: account.id,
      after: account,
    })

    return account
  },

  async update(companyId: string, id: string, data: UpdateAccountDto, req: Request) {
    const existing = await AccountService.findById(companyId, id)

    if (data.name !== undefined && data.name !== existing.name) {
      await checkNameConflict(companyId, data.name, id)
    }

    const updated = await prisma.account.update({
      where: { id },
      data,
      select: ACCOUNT_SELECT,
    })

    await writeAuditLog(req, {
      action: AuditAction.UPDATE,
      entityType: 'Account',
      entityId: id,
      before: existing,
      after: updated,
    })

    return updated
  },

  async delete(companyId: string, id: string, req: Request) {
    const existing = await AccountService.findById(companyId, id)

    await checkDependencies(companyId, id)

    await prisma.account.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    })

    await writeAuditLog(req, {
      action: AuditAction.DELETE,
      entityType: 'Account',
      entityId: id,
      before: existing,
    })
  },
}
