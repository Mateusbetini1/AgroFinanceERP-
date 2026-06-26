import { prisma } from '../../config/prisma'
import type { DashboardQuery, CashflowQuery, PayablesQuery } from './dashboard.schemas'
import { getPayrollSummary } from '../employee-payment/payroll-summary.service'
import { getMonthPeriod } from '../../shared/utils/month-period'

type MonthBucket = {
  year: number
  month: number
  received: number
  paidExpenses: number
  paidBills: number
  pendingReceivables: number
  pendingExpenses: number
  pendingBills: number
}

type FinancialAlert = {
  type: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  amount?: number
  accountId?: string
  accountName?: string
  relatedEntityType?: string
  relatedEntityId?: string
}

type AccountProjection = {
  accountId: string
  accountName: string
  type: string
  currentBalance: number
  projectedChange: number
  projectedBalance: number
}

type RecentMovement = {
  id: string
  type: 'REVENUE' | 'EXPENSE' | 'BILL' | 'EMPLOYEE_PAYMENT' | 'TRANSFER'
  date: Date
  description: string
  amount: number
  direction: 'INFLOW' | 'OUTFLOW' | 'TRANSFER'
  accountName?: string
  fromAccountName?: string
  toAccountName?: string
  relatedEntityType: string
  relatedEntityId: string
}

function toNumber(value: unknown): number {
  return Number(value ?? 0)
}

function getDayPeriod(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  return { start, end, bounds: { gte: start, lt: end } }
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function isInPeriod(date: Date, start: Date, end: Date) {
  return date >= start && date < end
}

function dateBounds(dateFrom?: Date, dateTo?: Date) {
  if (!dateFrom && !dateTo) return undefined
  return {
    ...(dateFrom ? { gte: dateFrom } : {}),
    ...(dateTo ? { lte: dateTo } : {}),
  }
}

function getDefaultPeriod(query: DashboardQuery): { start: Date; end: Date } {
  const now = new Date()
  const start = query.dateFrom ?? new Date(now.getFullYear(), now.getMonth(), 1)
  const end = query.dateTo ?? new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { start, end }
}

function defaultBounds(query: DashboardQuery, useDefaultPeriod = true) {
  const period = useDefaultPeriod ? getDefaultPeriod(query) : undefined
  return query.dateFrom || query.dateTo
    ? dateBounds(query.dateFrom, query.dateTo)
    : period
      ? { gte: period.start, lt: period.end }
      : undefined
}

function baseRevenueWhere(companyId: string, query: DashboardQuery, useDefaultPeriod = true) {
  const bounds = defaultBounds(query, useDefaultPeriod)

  return {
    companyId,
    deletedAt: null,
    ...(bounds ? { date: bounds } : {}),
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.safraId ? { safraId: query.safraId } : {}),
    ...(query.accountId ? { accountId: query.accountId } : {}),
  }
}

function cashRevenueWhere(companyId: string, query: DashboardQuery, useDefaultPeriod = true) {
  const bounds = defaultBounds(query, useDefaultPeriod)

  return {
    companyId,
    deletedAt: null,
    ...(bounds
      ? {
          OR: [
            { receivedAt: bounds },
            { receivedAt: null, date: bounds },
          ],
        }
      : {}),
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.safraId ? { safraId: query.safraId } : {}),
    ...(query.accountId ? { accountId: query.accountId } : {}),
  }
}

function baseExpenseWhere(companyId: string, query: DashboardQuery, useDefaultPeriod = true) {
  const bounds = defaultBounds(query, useDefaultPeriod)

  return {
    companyId,
    deletedAt: null,
    ...(bounds ? { date: bounds } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.safraId ? { safraId: query.safraId } : {}),
    ...(query.accountId ? { accountId: query.accountId } : {}),
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    ...(query.productId ? { safra: { productId: query.productId } } : {}),
  }
}

function cashExpenseWhere(companyId: string, query: DashboardQuery, useDefaultPeriod = true) {
  const bounds = defaultBounds(query, useDefaultPeriod)

  return {
    companyId,
    deletedAt: null,
    ...(bounds
      ? {
          OR: [
            { paidAt: bounds },
            { paidAt: null, date: bounds },
          ],
        }
      : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.safraId ? { safraId: query.safraId } : {}),
    ...(query.accountId ? { accountId: query.accountId } : {}),
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    ...(query.productId ? { safra: { productId: query.productId } } : {}),
  }
}

function forecastExpenseWhere(companyId: string, query: DashboardQuery, useDefaultPeriod = true) {
  const bounds = defaultBounds(query, useDefaultPeriod)

  return {
    companyId,
    deletedAt: null,
    ...(bounds
      ? {
          OR: [
            { dueDate: bounds },
            { dueDate: null, date: bounds },
          ],
        }
      : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.safraId ? { safraId: query.safraId } : {}),
    ...(query.accountId ? { accountId: query.accountId } : {}),
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    ...(query.productId ? { safra: { productId: query.productId } } : {}),
  }
}

function baseBillWhere(companyId: string, query: DashboardQuery, useDefaultPeriod = true) {
  const bounds = defaultBounds(query, useDefaultPeriod)

  return {
    companyId,
    deletedAt: null,
    ...(bounds ? { dueDate: bounds } : {}),
    ...(query.accountId ? { accountId: query.accountId } : {}),
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
  }
}

function cashBillWhere(companyId: string, query: DashboardQuery, useDefaultPeriod = true) {
  const bounds = defaultBounds(query, useDefaultPeriod)

  return {
    companyId,
    deletedAt: null,
    ...(bounds
      ? {
          OR: [
            { paidAt: bounds },
            { paidAt: null, dueDate: bounds },
          ],
        }
      : {}),
    ...(query.accountId ? { accountId: query.accountId } : {}),
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
  }
}

function monthKey(date: Date): string {
  return date.getFullYear() + '-' + (date.getMonth() + 1)
}

function ensureMonthBucket(buckets: Map<string, MonthBucket>, date: Date): MonthBucket {
  const key = monthKey(date)
  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      received: 0,
      paidExpenses: 0,
      paidBills: 0,
      pendingReceivables: 0,
      pendingExpenses: 0,
      pendingBills: 0,
    }
    buckets.set(key, bucket)
  }
  return bucket
}

function initializeBuckets(startDate: Date, endDate: Date): Map<string, MonthBucket> {
  const buckets = new Map<string, MonthBucket>()
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1)

  while (cursor <= end) {
    ensureMonthBucket(buckets, cursor)
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return buckets
}

export const DashboardService = {
  async summary(companyId: string) {
    return DashboardService.overview(companyId, {})
  },

  async live(companyId: string) {
    const now = new Date()
    const today = getDayPeriod(now)
    const next7End = addDays(today.start, 7)
    const next30End = addDays(today.start, 30)
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    const [
      accounts,
      todayRevenue,
      todayExpense,
      todayBill,
      todayEmployeePayment,
      todayTransfer,
      pendingRevenues,
      pendingExpenses,
      pendingBills,
      payroll,
      recentRevenues,
      recentExpenses,
      recentBills,
      recentEmployeePayments,
      recentTransfers,
    ] = await Promise.all([
      prisma.account.findMany({
        where: { companyId, deletedAt: null, active: true },
        select: { id: true, name: true, type: true, currentBalance: true, active: true },
        orderBy: { name: 'asc' },
      }),
      prisma.revenue.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'RECEIVED',
          OR: [{ receivedAt: today.bounds }, { receivedAt: null, date: today.bounds }],
        },
        _sum: { totalAmount: true },
      }),
      prisma.expense.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          OR: [{ paidAt: today.bounds }, { paidAt: null, date: today.bounds }],
        },
        _sum: { amount: true },
      }),
      prisma.bill.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          OR: [{ paidAt: today.bounds }, { paidAt: null, dueDate: today.bounds }],
        },
        _sum: { amount: true },
      }),
      prisma.employeePayment.aggregate({
        where: { companyId, deletedAt: null, date: today.bounds },
        _sum: { amount: true },
      }),
      prisma.transfer.aggregate({
        where: { companyId, deletedAt: null, date: today.bounds },
        _sum: { amount: true },
      }),
      prisma.revenue.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: 'PENDING',
          OR: [{ receivedAt: { lt: next30End } }, { receivedAt: null, date: { lt: next30End } }],
        },
        select: { id: true, accountId: true, date: true, receivedAt: true, totalAmount: true },
      }),
      prisma.expense.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: { in: ['PENDING', 'OVERDUE'] },
          OR: [{ dueDate: { lt: next30End } }, { dueDate: null, date: { lt: next30End } }],
        },
        select: { id: true, accountId: true, date: true, dueDate: true, amount: true },
      }),
      prisma.bill.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: { in: ['PENDING', 'OVERDUE'] },
          dueDate: { lt: next30End },
        },
        select: { id: true, accountId: true, dueDate: true, amount: true },
      }),
      getPayrollSummary(companyId, currentMonth, currentYear),
      prisma.revenue.findMany({
        where: { companyId, deletedAt: null, status: 'RECEIVED' },
        select: {
          id: true,
          date: true,
          receivedAt: true,
          totalAmount: true,
          client: true,
          notes: true,
          product: { select: { name: true } },
          account: { select: { name: true } },
        },
        orderBy: [{ receivedAt: 'desc' }, { date: 'desc' }],
        take: 10,
      }),
      prisma.expense.findMany({
        where: { companyId, deletedAt: null, status: 'PAID' },
        select: {
          id: true,
          date: true,
          paidAt: true,
          description: true,
          amount: true,
          account: { select: { name: true } },
        },
        orderBy: [{ paidAt: 'desc' }, { date: 'desc' }],
        take: 10,
      }),
      prisma.bill.findMany({
        where: { companyId, deletedAt: null, status: 'PAID' },
        select: {
          id: true,
          dueDate: true,
          paidAt: true,
          description: true,
          amount: true,
          account: { select: { name: true } },
        },
        orderBy: [{ paidAt: 'desc' }, { dueDate: 'desc' }],
        take: 10,
      }),
      prisma.employeePayment.findMany({
        where: { companyId, deletedAt: null },
        select: {
          id: true,
          date: true,
          type: true,
          amount: true,
          notes: true,
          employee: { select: { name: true } },
          account: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
        take: 10,
      }),
      prisma.transfer.findMany({
        where: { companyId, deletedAt: null },
        select: {
          id: true,
          date: true,
          amount: true,
          description: true,
          fromAccount: { select: { name: true } },
          toAccount: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
        take: 10,
      }),
    ])

    const balancesByAccount = accounts.map((account) => ({
      accountId: account.id,
      accountName: account.name,
      type: account.type,
      currentBalance: toNumber(account.currentBalance),
      active: account.active,
    }))
    const totalBalance = balancesByAccount.reduce((sum, account) => sum + account.currentBalance, 0)

    const projection7 = new Map<string, AccountProjection>()
    const projection30 = new Map<string, AccountProjection>()
    for (const account of balancesByAccount) {
      const base = {
        accountId: account.accountId,
        accountName: account.accountName,
        type: account.type,
        currentBalance: account.currentBalance,
        projectedChange: 0,
        projectedBalance: account.currentBalance,
      }
      projection7.set(account.accountId, { ...base })
      projection30.set(account.accountId, { ...base })
    }

    const addAccountProjection = (map: Map<string, AccountProjection>, accountId: string | null, amount: number) => {
      if (!accountId) return
      const current = map.get(accountId)
      if (!current) return
      current.projectedChange += amount
      current.projectedBalance += amount
    }

    let receivablesNext7Days = 0
    let receivablesNext30Days = 0
    let overdueReceivables = 0
    let unassignedReceivables7Days = 0
    let unassignedReceivables30Days = 0

    for (const revenue of pendingRevenues) {
      const expectedDate = revenue.receivedAt ?? revenue.date
      const amount = toNumber(revenue.totalAmount)
      if (expectedDate < today.start) overdueReceivables += amount
      if (isInPeriod(expectedDate, today.start, next7End)) {
        receivablesNext7Days += amount
        addAccountProjection(projection7, revenue.accountId, amount)
        if (!revenue.accountId) unassignedReceivables7Days += amount
      }
      if (isInPeriod(expectedDate, today.start, next30End)) {
        receivablesNext30Days += amount
        addAccountProjection(projection30, revenue.accountId, amount)
        if (!revenue.accountId) unassignedReceivables30Days += amount
      }
    }

    let payablesNext7Days = 0
    let payablesNext30Days = 0
    let overduePayables = 0
    let unassignedPayables7Days = 0
    let unassignedPayables30Days = 0

    const registerPayable = (date: Date, amount: number, accountId: string | null) => {
      if (date < today.start) overduePayables += amount
      if (isInPeriod(date, today.start, next7End)) {
        payablesNext7Days += amount
        addAccountProjection(projection7, accountId, -amount)
        if (!accountId) unassignedPayables7Days += amount
      }
      if (isInPeriod(date, today.start, next30End)) {
        payablesNext30Days += amount
        addAccountProjection(projection30, accountId, -amount)
        if (!accountId) unassignedPayables30Days += amount
      }
    }

    for (const expense of pendingExpenses) {
      registerPayable(expense.dueDate ?? expense.date, toNumber(expense.amount), expense.accountId)
    }
    for (const bill of pendingBills) {
      registerPayable(bill.dueDate, toNumber(bill.amount), bill.accountId)
    }

    const todayInflow = toNumber(todayRevenue._sum.totalAmount)
    const todayOutflow =
      toNumber(todayExpense._sum.amount) +
      toNumber(todayBill._sum.amount) +
      toNumber(todayEmployeePayment._sum.amount)
    const todayTransfers = toNumber(todayTransfer._sum.amount)
    const projectedBalance7Days = totalBalance + receivablesNext7Days - payablesNext7Days
    const projectedBalance30Days =
      totalBalance + receivablesNext30Days - payablesNext30Days - payroll.payrollRemaining

    const alerts: FinancialAlert[] = []
    if (projectedBalance7Days < 0) {
      alerts.push({
        type: 'NEGATIVE_PROJECTED_BALANCE_7_DAYS',
        severity: 'critical',
        message: 'Saldo total projetado pode ficar negativo nos próximos 7 dias.',
        amount: Math.abs(projectedBalance7Days),
      })
    }
    if (projectedBalance30Days < 0) {
      alerts.push({
        type: 'NEGATIVE_PROJECTED_BALANCE_30_DAYS',
        severity: 'warning',
        message: 'Saldo total projetado pode ficar negativo nos próximos 30 dias.',
        amount: Math.abs(projectedBalance30Days),
      })
    }
    for (const projection of [...projection7.values(), ...projection30.values()]) {
      if (projection.projectedBalance < 0) {
        alerts.push({
          type: 'NEGATIVE_PROJECTED_ACCOUNT_BALANCE',
          severity: 'warning',
          message: `A conta ${projection.accountName} pode ficar negativa pela projeção atual.`,
          amount: Math.abs(projection.projectedBalance),
          accountId: projection.accountId,
          accountName: projection.accountName,
        })
      }
    }
    if (overduePayables > 0) {
      alerts.push({
        type: 'OVERDUE_PAYABLES',
        severity: 'critical',
        message: 'Existem despesas ou boletos vencidos em aberto.',
        amount: overduePayables,
      })
    }
    if (overdueReceivables > 0) {
      alerts.push({
        type: 'OVERDUE_RECEIVABLES',
        severity: 'warning',
        message: 'Existem receitas pendentes com recebimento previsto vencido.',
        amount: overdueReceivables,
      })
    }
    if (payroll.payrollRemaining > 0) {
      alerts.push({
        type: 'PAYROLL_PENDING',
        severity: 'info',
        message: 'Ainda há folha de pagamento em aberto no mês atual.',
        amount: payroll.payrollRemaining,
      })
    }
    if (unassignedReceivables30Days > 0 || unassignedPayables30Days > 0) {
      alerts.push({
        type: 'UNASSIGNED_COMMITMENTS',
        severity: 'warning',
        message: 'Existem compromissos ou recebíveis sem conta definida nos próximos 30 dias.',
        amount: unassignedReceivables30Days + unassignedPayables30Days,
      })
    }

    const recentMovements: RecentMovement[] = [
      ...recentRevenues.map((revenue) => ({
        id: revenue.id,
        type: 'REVENUE' as const,
        date: revenue.receivedAt ?? revenue.date,
        description: 'Receita recebida - ' + revenue.product.name,
        amount: toNumber(revenue.totalAmount),
        direction: 'INFLOW' as const,
        accountName: revenue.account?.name,
        relatedEntityType: 'Revenue',
        relatedEntityId: revenue.id,
      })),
      ...recentExpenses.map((expense) => ({
        id: expense.id,
        type: 'EXPENSE' as const,
        date: expense.paidAt ?? expense.date,
        description: 'Despesa paga - ' + expense.description,
        amount: toNumber(expense.amount),
        direction: 'OUTFLOW' as const,
        accountName: expense.account?.name,
        relatedEntityType: 'Expense',
        relatedEntityId: expense.id,
      })),
      ...recentBills.map((bill) => ({
        id: bill.id,
        type: 'BILL' as const,
        date: bill.paidAt ?? bill.dueDate,
        description: 'Boleto pago - ' + bill.description,
        amount: toNumber(bill.amount),
        direction: 'OUTFLOW' as const,
        accountName: bill.account?.name,
        relatedEntityType: 'Bill',
        relatedEntityId: bill.id,
      })),
      ...recentEmployeePayments.map((payment) => ({
        id: payment.id,
        type: 'EMPLOYEE_PAYMENT' as const,
        date: payment.date,
        description: 'Pagamento funcionário - ' + payment.employee.name,
        amount: toNumber(payment.amount),
        direction: 'OUTFLOW' as const,
        accountName: payment.account?.name,
        relatedEntityType: 'EmployeePayment',
        relatedEntityId: payment.id,
      })),
      ...recentTransfers.map((transfer) => ({
        id: transfer.id,
        type: 'TRANSFER' as const,
        date: transfer.date,
        description: transfer.description ?? 'Transferência entre contas',
        amount: toNumber(transfer.amount),
        direction: 'TRANSFER' as const,
        fromAccountName: transfer.fromAccount.name,
        toAccountName: transfer.toAccount.name,
        relatedEntityType: 'Transfer',
        relatedEntityId: transfer.id,
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10)

    return {
      position: {
        totalBalance,
        balancesByAccount,
      },
      today: {
        todayInflow,
        todayOutflow,
        todayNetMovement: todayInflow - todayOutflow,
        todayTransfers,
      },
      commitments: {
        receivablesNext7Days,
        payablesNext7Days,
        overduePayables,
        overdueReceivables,
        receivablesNext30Days,
        payablesNext30Days,
        payrollRemainingCurrentMonth: payroll.payrollRemaining,
        unassignedReceivables7Days,
        unassignedPayables7Days,
        unassignedReceivables30Days,
        unassignedPayables30Days,
      },
      projection: {
        projectedBalance7Days,
        projectedBalance30Days,
        projectedByAccount7Days: Array.from(projection7.values()),
        projectedByAccount30Days: Array.from(projection30.values()),
        unassignedReceivables7Days,
        unassignedPayables7Days,
        unassignedReceivables30Days,
        unassignedPayables30Days,
      },
      alerts,
      recentMovements,
    }
  },

  async monthly(companyId: string, month: number, year: number) {
    const period = getMonthPeriod(month, year)
    const bounds = period.bounds

    const [
      realizedRevenue,
      pendingRevenue,
      paidExpenses,
      pendingExpenses,
      paidBills,
      pendingBills,
      employeePaymentsPaid,
      payroll,
    ] = await Promise.all([
      prisma.revenue.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'RECEIVED',
          OR: [{ receivedAt: bounds }, { receivedAt: null, date: bounds }],
        },
        _sum: { totalAmount: true },
      }),
      prisma.revenue.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PENDING',
          OR: [{ receivedAt: bounds }, { receivedAt: null, date: bounds }],
        },
        _sum: { totalAmount: true },
      }),
      prisma.expense.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          OR: [{ paidAt: bounds }, { paidAt: null, date: bounds }],
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: { in: ['PENDING', 'OVERDUE'] },
          OR: [{ dueDate: bounds }, { dueDate: null, date: bounds }],
        },
        _sum: { amount: true },
      }),
      prisma.bill.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PAID',
          OR: [{ paidAt: bounds }, { paidAt: null, dueDate: bounds }],
        },
        _sum: { amount: true },
      }),
      prisma.bill.aggregate({
        where: { companyId, deletedAt: null, status: { in: ['PENDING', 'OVERDUE'] }, dueDate: bounds },
        _sum: { amount: true },
      }),
      prisma.employeePayment.aggregate({
        where: { companyId, deletedAt: null, date: bounds },
        _sum: { amount: true },
      }),
      getPayrollSummary(companyId, month, year),
    ])

    const realizedRevenueTotal = toNumber(realizedRevenue._sum.totalAmount)
    const pendingRevenueTotal = toNumber(pendingRevenue._sum.totalAmount)
    const paidExpensesTotal = toNumber(paidExpenses._sum.amount)
    const pendingExpensesTotal = toNumber(pendingExpenses._sum.amount)
    const paidBillsTotal = toNumber(paidBills._sum.amount)
    const pendingBillsTotal = toNumber(pendingBills._sum.amount)
    const employeePaymentsPaidTotal = toNumber(employeePaymentsPaid._sum.amount)
    const realizedOutflows = paidExpensesTotal + paidBillsTotal + employeePaymentsPaidTotal
    const realizedResult = realizedRevenueTotal - realizedOutflows
    const projectedInflows = realizedRevenueTotal + pendingRevenueTotal
    const projectedOutflows =
      paidExpensesTotal +
      paidBillsTotal +
      employeePaymentsPaidTotal +
      pendingExpensesTotal +
      pendingBillsTotal +
      payroll.payrollRemaining

    return {
      month,
      year,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      realizedRevenue: realizedRevenueTotal,
      pendingRevenue: pendingRevenueTotal,
      paidExpenses: paidExpensesTotal,
      pendingExpenses: pendingExpensesTotal,
      paidBills: paidBillsTotal,
      pendingBills: pendingBillsTotal,
      employeePaymentsPaid: employeePaymentsPaidTotal,
      realizedOutflows,
      realizedResult,
      projectedInflows,
      projectedOutflows,
      projectedResult: projectedInflows - projectedOutflows,
      payroll,
    }
  },

  async overview(companyId: string, query: DashboardQuery) {
    const now = new Date()
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const revenueWhere = cashRevenueWhere(companyId, query)
    const expenseWhere = cashExpenseWhere(companyId, query)
    const billWhere = cashBillWhere(companyId, query)
    const pendingRevenueWhere = baseRevenueWhere(companyId, query)
    const pendingExpenseWhere = forecastExpenseWhere(companyId, query)
    const pendingBillWhere = baseBillWhere(companyId, query)

    const [
      accountsAgg,
      revenueTotal,
      expenseTotal,
      billPaidTotal,
      pendingReceivables,
      pendingExpenses,
      pendingBills,
      overdueExpenses,
      overdueBills,
      activeSafras,
      billsDueSoon,
    ] = await Promise.all([
      prisma.account.aggregate({
        where: { companyId, deletedAt: null, active: true },
        _sum: { currentBalance: true },
      }),
      prisma.revenue.aggregate({
        where: { ...revenueWhere, status: 'RECEIVED' },
        _sum: { totalAmount: true },
      }),
      prisma.expense.aggregate({
        where: { ...expenseWhere, status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.bill.aggregate({
        where: { ...billWhere, status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.revenue.aggregate({
        where: { ...pendingRevenueWhere, status: 'PENDING' },
        _sum: { totalAmount: true },
      }),
      prisma.expense.aggregate({
        where: { ...pendingExpenseWhere, status: { in: ['PENDING', 'OVERDUE'] } },
        _sum: { amount: true },
      }),
      prisma.bill.aggregate({
        where: { ...pendingBillWhere, status: { in: ['PENDING', 'OVERDUE'] } },
        _sum: { amount: true },
      }),
      // TODO: quando houver garantia/cron de vencidos, considerar calcular por dueDate < now.
      prisma.expense.aggregate({
        where: { ...pendingExpenseWhere, status: 'OVERDUE' },
        _sum: { amount: true },
      }),
      // TODO: quando houver garantia/cron de vencidos, considerar calcular por dueDate < now.
      prisma.bill.aggregate({
        where: { ...pendingBillWhere, status: 'OVERDUE' },
        _sum: { amount: true },
      }),
      prisma.safra.count({
        where: {
          companyId,
          deletedAt: null,
          status: 'ACTIVE',
          ...(query.productId ? { productId: query.productId } : {}),
          ...(query.safraId ? { id: query.safraId } : {}),
        },
      }),
      prisma.bill.aggregate({
        where: {
          companyId,
          deletedAt: null,
          status: 'PENDING',
          dueDate: { gte: now, lt: sevenDaysLater },
          ...(query.accountId ? { accountId: query.accountId } : {}),
          ...(query.supplierId ? { supplierId: query.supplierId } : {}),
        },
        _sum: { amount: true },
        _count: true,
      }),
    ])

    const received = toNumber(revenueTotal._sum.totalAmount)
    const paidExpenses = toNumber(expenseTotal._sum.amount)
    const paidBills = toNumber(billPaidTotal._sum.amount)
    const expenseAndBillTotal = paidExpenses + paidBills

    return {
      totalBalance: toNumber(accountsAgg._sum.currentBalance),
      revenueTotal: received,
      expenseTotal: expenseAndBillTotal,
      netResult: received - expenseAndBillTotal,
      pendingReceivables: toNumber(pendingReceivables._sum.totalAmount),
      pendingPayables: toNumber(pendingExpenses._sum.amount) + toNumber(pendingBills._sum.amount),
      overdueTotal: toNumber(overdueExpenses._sum.amount) + toNumber(overdueBills._sum.amount),
      activeSafras,
      billsDueSoon: {
        count: billsDueSoon._count,
        total: toNumber(billsDueSoon._sum.amount),
      },
    }
  },

  async cashflow(companyId: string, query: CashflowQuery) {
    const now = new Date()
    const startDate = query.dateFrom ?? new Date(now.getFullYear(), now.getMonth() - (query.months ?? 6) + 1, 1)
    const endDate = query.dateTo ?? now
    const rangeQuery = { ...query, dateFrom: startDate, dateTo: endDate }

    const [revenues, expenses, bills, pendingRevenues, pendingExpenses, pendingBills] = await Promise.all([
      prisma.revenue.findMany({
        where: { ...cashRevenueWhere(companyId, rangeQuery, false), status: 'RECEIVED' },
        select: { date: true, receivedAt: true, totalAmount: true },
      }),
      prisma.expense.findMany({
        where: { ...cashExpenseWhere(companyId, rangeQuery, false), status: 'PAID' },
        select: { date: true, paidAt: true, amount: true },
      }),
      prisma.bill.findMany({
        where: { ...cashBillWhere(companyId, rangeQuery, false), status: 'PAID' },
        select: { dueDate: true, paidAt: true, amount: true },
      }),
      prisma.revenue.findMany({
        where: { ...baseRevenueWhere(companyId, rangeQuery, false), status: 'PENDING' },
        select: { date: true, totalAmount: true },
      }),
      prisma.expense.findMany({
        where: { ...forecastExpenseWhere(companyId, rangeQuery, false), status: { in: ['PENDING', 'OVERDUE'] } },
        select: { date: true, dueDate: true, amount: true },
      }),
      prisma.bill.findMany({
        where: { ...baseBillWhere(companyId, rangeQuery, false), status: { in: ['PENDING', 'OVERDUE'] } },
        select: { dueDate: true, amount: true },
      }),
    ])

    const buckets = initializeBuckets(startDate, endDate)

    for (const item of revenues) ensureMonthBucket(buckets, item.receivedAt ?? item.date).received += toNumber(item.totalAmount)
    for (const item of expenses) ensureMonthBucket(buckets, item.paidAt ?? item.date).paidExpenses += toNumber(item.amount)
    for (const item of bills) ensureMonthBucket(buckets, item.paidAt ?? item.dueDate).paidBills += toNumber(item.amount)
    for (const item of pendingRevenues) ensureMonthBucket(buckets, item.date).pendingReceivables += toNumber(item.totalAmount)
    for (const item of pendingExpenses) ensureMonthBucket(buckets, item.dueDate ?? item.date).pendingExpenses += toNumber(item.amount)
    for (const item of pendingBills) ensureMonthBucket(buckets, item.dueDate).pendingBills += toNumber(item.amount)

    return Array.from(buckets.values())
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .map((bucket) => {
        const outflow = bucket.paidExpenses + bucket.paidBills
        const projectedOutflow = bucket.pendingExpenses + bucket.pendingBills
        return {
          year: bucket.year,
          month: bucket.month,
          inflow: bucket.received,
          outflow,
          net: bucket.received - outflow,
          projection: {
            pendingReceivables: bucket.pendingReceivables,
            pendingPayables: projectedOutflow,
            projectedNet: bucket.pendingReceivables - projectedOutflow,
          },
        }
      })
  },

  async categories(companyId: string, query: DashboardQuery) {
    // Visao operacional: despesas lancadas no periodo, independentemente do status.
    const grouped = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: baseExpenseWhere(companyId, query),
      _sum: { amount: true },
    })

    const total = grouped.reduce((sum, item) => sum + toNumber(item._sum.amount), 0)
    const categoryIds = grouped.map((item) => item.categoryId)
    const categories = await prisma.category.findMany({
      where: { companyId, id: { in: categoryIds }, deletedAt: null },
      select: { id: true, name: true, color: true },
    })
    const byId = new Map(categories.map((category) => [category.id, category]))

    return grouped
      .map((item) => {
        const category = byId.get(item.categoryId)
        const categoryTotal = toNumber(item._sum.amount)
        return {
          id: item.categoryId,
          name: category?.name ?? 'Categoria removida',
          color: category?.color ?? null,
          total: categoryTotal,
          percentage: total > 0 ? (categoryTotal / total) * 100 : 0,
        }
      })
      .sort((a, b) => b.total - a.total)
  },

  async products(companyId: string, query: DashboardQuery) {
    // Visao operacional: vendas por produto, incluindo PENDING e RECEIVED.
    const grouped = await prisma.revenue.groupBy({
      by: ['productId'],
      where: baseRevenueWhere(companyId, query),
      _sum: { totalAmount: true, quantity: true },
    })

    const productIds = grouped.map((item) => item.productId)
    const products = await prisma.product.findMany({
      where: { companyId, id: { in: productIds }, deletedAt: null },
      select: { id: true, name: true },
    })
    const byId = new Map(products.map((product) => [product.id, product]))

    return grouped
      .map((item) => ({
        id: item.productId,
        name: byId.get(item.productId)?.name ?? 'Produto removido',
        totalAmount: toNumber(item._sum.totalAmount),
        quantity: toNumber(item._sum.quantity),
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
  },

  async safras(companyId: string, query: DashboardQuery) {
    // Visao economica/operacional: receitas e despesas da safra independentemente do status.
    const [revenues, expenses] = await Promise.all([
      prisma.revenue.groupBy({
        by: ['safraId'],
        where: { ...baseRevenueWhere(companyId, query), safraId: { not: null } },
        _sum: { totalAmount: true },
      }),
      prisma.expense.groupBy({
        by: ['safraId'],
        where: { ...baseExpenseWhere(companyId, query), safraId: { not: null } },
        _sum: { amount: true },
      }),
    ])

    const totals = new Map<string, { revenueTotal: number; expenseTotal: number }>()
    for (const item of revenues) {
      if (!item.safraId) continue
      totals.set(item.safraId, {
        revenueTotal: toNumber(item._sum.totalAmount),
        expenseTotal: totals.get(item.safraId)?.expenseTotal ?? 0,
      })
    }
    for (const item of expenses) {
      if (!item.safraId) continue
      const current = totals.get(item.safraId) ?? { revenueTotal: 0, expenseTotal: 0 }
      current.expenseTotal = toNumber(item._sum.amount)
      totals.set(item.safraId, current)
    }

    const safraIds = Array.from(totals.keys())
    const safras = await prisma.safra.findMany({
      where: { companyId, id: { in: safraIds }, deletedAt: null },
      select: { id: true, name: true, status: true, product: { select: { id: true, name: true } } },
    })
    const byId = new Map(safras.map((safra) => [safra.id, safra]))

    return safraIds
      .map((id) => {
        const totalsForSafra = totals.get(id)!
        const safra = byId.get(id)
        return {
          id,
          name: safra?.name ?? 'Safra removida',
          status: safra?.status ?? null,
          product: safra?.product ?? null,
          revenueTotal: totalsForSafra.revenueTotal,
          expenseTotal: totalsForSafra.expenseTotal,
          result: totalsForSafra.revenueTotal - totalsForSafra.expenseTotal,
        }
      })
      .sort((a, b) => b.result - a.result)
  },

  async payables(companyId: string, query: PayablesQuery) {
    const [expenses, bills] = await Promise.all([
      prisma.expense.findMany({
        where: { ...baseExpenseWhere(companyId, query, false), status: { in: ['PENDING', 'OVERDUE'] } },
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
      }),
      prisma.bill.findMany({
        where: { ...baseBillWhere(companyId, query, false), status: { in: ['PENDING', 'OVERDUE'] } },
        select: {
          id: true,
          description: true,
          amount: true,
          status: true,
          dueDate: true,
          supplier: { select: { id: true, name: true } },
        },
      }),
    ])

    return [
      ...expenses.map((expense) => ({
        id: expense.id,
        type: 'EXPENSE' as const,
        description: expense.description,
        amount: toNumber(expense.amount),
        status: expense.status,
        dueDate: expense.dueDate ?? expense.date,
        category: expense.category,
        supplier: expense.supplier,
      })),
      ...bills.map((bill) => ({
        id: bill.id,
        type: 'BILL' as const,
        description: bill.description,
        amount: toNumber(bill.amount),
        status: bill.status,
        dueDate: bill.dueDate,
        category: null,
        supplier: bill.supplier,
      })),
    ]
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, query.limit)
  },
}
