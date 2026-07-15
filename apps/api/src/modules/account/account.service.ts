import type { Request } from 'express'
import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import { getPaginationArgs, buildPaginatedResponse } from '../../shared/utils/pagination'
import { writeAuditLog } from '../../shared/middleware/audit-log'
import { AuditAction } from '@agrofinance/shared'
import type { AccountSummaryQuery, CreateAccountDto, UpdateAccountDto, ListAccountsQuery } from './account.schemas'

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

function toNumber(value: unknown): number {
  return Number(value ?? 0)
}

function getSummaryPeriod(query: AccountSummaryQuery) {
  const now = new Date()
  const year = query.year ?? now.getFullYear()
  const month = query.month ?? now.getMonth() + 1

  return {
    year,
    month,
    startDate: new Date(year, month - 1, 1),
    endDate: new Date(year, month, 1),
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

  async summary(companyId: string, id: string, query: AccountSummaryQuery) {
    const account = await AccountService.findById(companyId, id)
    const period = getSummaryPeriod(query)
    const bounds = { gte: period.startDate, lt: period.endDate }

    const [
      pendingRevenues,
      pendingExpenses,
      pendingBills,
      receivedRevenues,
      paidExpenses,
      paidBills,
      employeePayments,
      transfers,
    ] = await Promise.all([
      prisma.revenue.findMany({
        where: {
          companyId,
          accountId: id,
          deletedAt: null,
          status: 'PENDING',
          OR: [{ receivedAt: bounds }, { receivedAt: null, date: bounds }],
        },
        select: {
          id: true,
          date: true,
          receivedAt: true,
          totalAmount: true,
          status: true,
          client: true,
          notes: true,
          product: { select: { id: true, name: true } },
        },
        orderBy: [{ receivedAt: 'asc' }, { date: 'asc' }],
      }),
      prisma.expense.findMany({
        where: {
          companyId,
          accountId: id,
          deletedAt: null,
          status: { in: ['PENDING', 'OVERDUE'] },
          OR: [{ dueDate: bounds }, { dueDate: null, date: bounds }],
        },
        select: {
          id: true,
          description: true,
          amount: true,
          status: true,
          date: true,
          dueDate: true,
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { date: 'asc' }],
      }),
      prisma.bill.findMany({
        where: {
          companyId,
          accountId: id,
          deletedAt: null,
          status: { in: ['PENDING', 'OVERDUE'] },
          dueDate: bounds,
        },
        select: {
          id: true,
          description: true,
          amount: true,
          status: true,
          dueDate: true,
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.revenue.findMany({
        where: {
          companyId,
          accountId: id,
          deletedAt: null,
          status: 'RECEIVED',
          OR: [{ receivedAt: bounds }, { receivedAt: null, date: bounds }],
        },
        select: {
          id: true,
          date: true,
          receivedAt: true,
          totalAmount: true,
          client: true,
          notes: true,
          product: { select: { name: true } },
        },
      }),
      prisma.expense.findMany({
        where: {
          companyId,
          accountId: id,
          deletedAt: null,
          status: 'PAID',
          OR: [{ paidAt: bounds }, { paidAt: null, date: bounds }],
        },
        select: {
          id: true,
          date: true,
          paidAt: true,
          description: true,
          amount: true,
          category: { select: { name: true } },
          supplier: { select: { name: true } },
        },
      }),
      prisma.bill.findMany({
        where: {
          companyId,
          accountId: id,
          deletedAt: null,
          status: 'PAID',
          OR: [{ paidAt: bounds }, { paidAt: null, dueDate: bounds }],
        },
        select: {
          id: true,
          dueDate: true,
          paidAt: true,
          description: true,
          amount: true,
          category: { select: { name: true } },
          supplier: { select: { name: true } },
        },
      }),
      prisma.employeePayment.findMany({
        where: { companyId, accountId: id, deletedAt: null, date: bounds },
        select: {
          id: true,
          date: true,
          type: true,
          amount: true,
          notes: true,
          employee: { select: { id: true, name: true } },
        },
      }),
      prisma.transfer.findMany({
        where: {
          companyId,
          deletedAt: null,
          date: bounds,
          OR: [{ fromAccountId: id }, { toAccountId: id }],
        },
        select: {
          id: true,
          date: true,
          amount: true,
          description: true,
          fromAccountId: true,
          toAccountId: true,
          fromAccount: { select: { id: true, name: true } },
          toAccount: { select: { id: true, name: true } },
        },
      }),
    ])

    const pendingInflows = pendingRevenues.reduce((sum, revenue) => sum + toNumber(revenue.totalAmount), 0)
    const pendingOutflows =
      pendingExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0) +
      pendingBills.reduce((sum, bill) => sum + toNumber(bill.amount), 0)

    const movements = [
      ...receivedRevenues.map((revenue) => ({
        id: `revenue-${revenue.id}`,
        date: revenue.receivedAt ?? revenue.date,
        sourceType: 'REVENUE' as const,
        description: revenue.client ?? revenue.product.name,
        amount: toNumber(revenue.totalAmount),
        direction: 'INFLOW' as const,
        relatedId: revenue.id,
      })),
      ...paidExpenses.map((expense) => ({
        id: `expense-${expense.id}`,
        date: expense.paidAt ?? expense.date,
        sourceType: 'EXPENSE' as const,
        description: expense.description,
        amount: toNumber(expense.amount),
        direction: 'OUTFLOW' as const,
        relatedId: expense.id,
      })),
      ...paidBills.map((bill) => ({
        id: `bill-${bill.id}`,
        date: bill.paidAt ?? bill.dueDate,
        sourceType: 'BILL' as const,
        description: bill.description,
        amount: toNumber(bill.amount),
        direction: 'OUTFLOW' as const,
        relatedId: bill.id,
      })),
      ...employeePayments.map((payment) => ({
        id: `employee-payment-${payment.id}`,
        date: payment.date,
        sourceType: 'EMPLOYEE_PAYMENT' as const,
        description: payment.notes ?? `Pagamento ${payment.employee.name}`,
        amount: toNumber(payment.amount),
        direction: 'OUTFLOW' as const,
        relatedId: payment.id,
      })),
      ...transfers.map((transfer) => {
        const isInflow = transfer.toAccountId === id
        return {
          id: `transfer-${transfer.id}-${isInflow ? 'in' : 'out'}`,
          date: transfer.date,
          sourceType: 'TRANSFER' as const,
          description:
            transfer.description ??
            (isInflow
              ? `Transferencia de ${transfer.fromAccount.name}`
              : `Transferencia para ${transfer.toAccount.name}`),
          amount: toNumber(transfer.amount),
          direction: isInflow ? ('INFLOW' as const) : ('OUTFLOW' as const),
          relatedId: transfer.id,
        }
      }),
    ].sort((a, b) => b.date.getTime() - a.date.getTime())

    const inflows = movements
      .filter((movement) => movement.direction === 'INFLOW')
      .reduce((sum, movement) => sum + movement.amount, 0)
    const outflows = movements
      .filter((movement) => movement.direction === 'OUTFLOW')
      .reduce((sum, movement) => sum + movement.amount, 0)

    return {
      account,
      period,
      totals: {
        inflows,
        outflows,
        net: inflows - outflows,
        pendingInflows,
        pendingOutflows,
      },
      pending: {
        revenues: pendingRevenues.map((revenue) => ({
          id: revenue.id,
          date: revenue.receivedAt ?? revenue.date,
          description: revenue.client ?? revenue.product.name,
          amount: toNumber(revenue.totalAmount),
          status: revenue.status,
          sourceType: 'REVENUE' as const,
        })),
        expenses: pendingExpenses.map((expense) => ({
          id: expense.id,
          date: expense.dueDate ?? expense.date,
          description: expense.description,
          amount: toNumber(expense.amount),
          status: expense.status,
          sourceType: 'EXPENSE' as const,
          supplier: expense.supplier,
          category: expense.category,
        })),
        bills: pendingBills.map((bill) => ({
          id: bill.id,
          date: bill.dueDate,
          description: bill.description,
          amount: toNumber(bill.amount),
          status: bill.status,
          sourceType: 'BILL' as const,
          supplier: bill.supplier,
          category: bill.category,
        })),
        employeePayments: [],
      },
      movements,
    }
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
